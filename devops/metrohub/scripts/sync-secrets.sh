#!/usr/bin/env bash
#
# sync-secrets.sh — provision Docker Swarm secrets from ONE plaintext
# secrets.yaml (the readable source of truth). Fleet secrets standard
# (BASELINE.md §4).
#
# Why this shape: the pain with the old interactive provisioner was that it
# *generated* values that then lived write-only inside Swarm. Here you AUTHOR
# the values in secrets.yaml and this script syncs them into Swarm secrets — so
# the file is your durable, readable source and "write-only" stops mattering.
# The stack is unchanged (services keep `external: true`); this only replaces
# how the secret objects get created. Swarm secrets stay fail-closed (deploy
# refuses if one is absent), multi-node-safe, and per-service scoped.
#
# secrets.yaml format — a flat map, one secret per line:
#     <name>: <value>
#   * lines starting with # are comments; blank lines ignored
#   * the FIRST ':' splits name from value (values may contain ':' — e.g. URIs)
#   * values may be wrapped in matching single/double quotes (stripped)
#   * an empty value, or the literal __DISABLED__, provisions the __DISABLED__
#     sentinel (the object exists so deploy succeeds; the feature stays off)
# Keep it server-local: /opt/<project>/shared/secrets.yaml, chmod 600, off git,
# backed up with the box.
#
# Optional catalog (--catalog) declares required/optional for the --check gate;
# an OMITTED optional is created as __DISABLED__ (apply only creates MISSING
# secrets — it never disables an already-created one). Format per line:
#   <name>  required|optional  [desc...]
# Optional --stack <ns> namespaces the Swarm secret objects as <ns>_<name> (for
# co-tenant boxes running more than one stack on the same node).
#
# Modes:
#   (default)         create any missing secret from the YAML; leave existing
#                     ones untouched (report drift where the YAML value differs).
#   --check           non-interactive CI gate: every catalog secret exists and
#                     every required one has a real value. Exit 1 listing gaps.
#   --rotate <name…>  recreate the named secret(s) from the YAML (rm + create).
#
# Usage:
#   ./sync-secrets.sh --file /opt/<project>/shared/secrets.yaml --catalog ./secrets.catalog
#   ./sync-secrets.sh --file … [--stack <stack>]     # namespace per stack (co-tenant boxes only)
#   ./sync-secrets.sh --file … --check
#   ./sync-secrets.sh --file … [--stack <stack>] --rotate <name>
#
set -euo pipefail

SENTINEL="__DISABLED__"
FILE=""; CATALOG=""; STACK=""; MODE="apply"; ROTATE_TARGETS=()

usage() { sed -n '2,45p' "$0"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --file)    [ $# -ge 2 ] || { echo "Error: --file needs a value." >&2; exit 2; };    FILE="$2"; shift 2;;
    --catalog) [ $# -ge 2 ] || { echo "Error: --catalog needs a value." >&2; exit 2; }; CATALOG="$2"; shift 2;;
    --stack)   [ $# -ge 2 ] || { echo "Error: --stack needs a value." >&2; exit 2; };   STACK="$2"; shift 2;;
    --check)   MODE="check"; shift;;
    --rotate)  MODE="rotate"; shift;;
    -h|--help) usage; exit 0;;
    -*) echo "Unknown flag: $1" >&2; exit 2;;
    *)  ROTATE_TARGETS+=("$1"); shift;;
  esac
done

[ -n "$FILE" ] || { echo "Error: --file <secrets.yaml> is required." >&2; exit 2; }
[ -f "$FILE" ] || { echo "Error: file not found: $FILE" >&2; exit 2; }
[ -z "$CATALOG" ] || [ -f "$CATALOG" ] || { echo "Error: catalog not found: $CATALOG" >&2; exit 2; }
if [ "${#ROTATE_TARGETS[@]}" -gt 0 ] && [ "$MODE" != "rotate" ]; then
  echo "Error: secret name(s) are only valid with --rotate." >&2; exit 2
fi
if [ "$MODE" = "rotate" ] && [ "${#ROTATE_TARGETS[@]}" -eq 0 ]; then
  echo "Error: --rotate needs at least one secret name." >&2; exit 2
fi

command -v docker >/dev/null 2>&1 || { echo "Error: docker not found." >&2; exit 1; }
# Must be an active MANAGER: LocalNodeState=active is also true on worker nodes,
# but `docker secret` requires a manager (ControlAvailable=true) — check both so a
# non-manager fails fast here instead of with a confusing error later.
if [ "$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo inactive)" != "active" ] \
   || [ "$(docker info --format '{{.Swarm.ControlAvailable}}' 2>/dev/null || echo false)" != "true" ]; then
  echo "Error: this node is not an active Swarm MANAGER — 'docker secret' needs a manager (run provision-vps.sh first)." >&2; exit 1
fi
command -v openssl >/dev/null 2>&1 || { echo "Error: openssl not found (needed for change detection)." >&2; exit 1; }

full_name()   { printf '%s' "${STACK:+${STACK}_}$1"; }
secret_exists(){ docker secret inspect "$1" >/dev/null 2>&1; }
content_hash(){ printf '%s' "$1" | openssl dgst -sha256 | awk '{print $NF}'; }  # full digest — no truncation
# Render EMPTY (not the literal "<no value>") when the content label is absent,
# so a label-less secret isn't mistaken for a value and reported as false DRIFT.
existing_hash(){ docker secret inspect --format '{{if .Spec.Labels}}{{index .Spec.Labels "content"}}{{end}}' "$1" 2>/dev/null || true; }
create_secret(){ printf '%s' "$2" | docker secret create --label "content=$(content_hash "$2")" "$1" - >/dev/null; }

# A required secret must have a REAL value — reject empty, the disable sentinel,
# and the shipped template placeholder (CHANGE_ME), so a half-filled secrets.yaml
# can't deploy known/placeholder credentials.
is_usable_required_value(){ case "$1" in ""|"$SENTINEL"|CHANGE_ME) return 1;; *) return 0;; esac; }
# Echo a name's required|optional class from the catalog (empty if no catalog / not found).
catalog_kind(){ [ -n "$CATALOG" ] && awk -v k="$1" '$1==k{print $2; exit}' "$CATALOG"; }

# Parse the flat YAML into "<name>\t<value>" lines.
parse_yaml() {
  while IFS= read -r line || [ -n "$line" ]; do
    trimmed="${line#"${line%%[![:space:]]*}"}"
    [ -n "$trimmed" ] || continue
    case "$trimmed" in \#*) continue;; esac
    # A non-comment, non-blank line with no ':' is malformed — surface it instead
    # of silently dropping the secret (stderr, so it doesn't pollute stdout).
    case "$line" in *:*) : ;; *) echo "  ! ignoring malformed line (no ':'): $trimmed" >&2; continue;; esac
    key="${line%%:*}"; val="${line#*:}"
    key="${key#"${key%%[![:space:]]*}"}"; key="${key%"${key##*[![:space:]]}"}"
    # Empty key (e.g. ": value") would create an unnamed Swarm secret — skip it.
    [ -n "$key" ] || { echo "  ! ignoring malformed line (empty key): $trimmed" >&2; continue; }
    # ltrim after the colon; strip inline "# comment" from UNQUOTED values; then rtrim.
    val="${val#"${val%%[![:space:]]*}"}"
    case "$val" in
      \"*|\'*) : ;;                            # quoted: leave for the quote-strip below
      \#*)     val="" ;;                       # value is only a comment (e.g. `foo: # x`) -> empty
      *)       val="${val%%[[:space:]]#*}" ;;  # strip a trailing " # comment" (needs space before #)
    esac
    val="${val%"${val##*[![:space:]]}"}"
    case "$val" in
      \"*\") val="${val#\"}"; val="${val%\"}";;
      \'*\') val="${val#\'}"; val="${val%\'}";;
    esac
    printf '%s\t%s\n' "$key" "$val"
  done < "$FILE"
}

PARSED="$(mktemp)"; trap 'rm -f "$PARSED"' EXIT
parse_yaml > "$PARSED"

# Fail fast on duplicate secret names — yaml_value() emits ALL matches, so a dup
# would silently become a multi-line secret value and hide which one applies.
dupes="$(cut -f1 "$PARSED" | sort | uniq -d)"
if [ -n "$dupes" ]; then
  echo "Error: duplicate secret name(s) in $FILE — each must appear once:" >&2
  printf '%s\n' "$dupes" | sed 's/^/   - /' >&2
  exit 2
fi

yaml_value() { awk -F'\t' -v k="$1" '$1==k{print $2; f=1} END{exit !f}' "$PARSED"; }
yaml_has()   { awk -F'\t' -v k="$1" '$1==k{f=1} END{exit !f}' "$PARSED"; }

# ── mode: --check ─────────────────────────────────────────────────────────────
if [ "$MODE" = "check" ]; then
  missing=()
  if [ -n "$CATALOG" ]; then
    while read -r name kind _; do
      [ -n "${name:-}" ] || continue
      case "$name" in \#*) continue;; esac
      full="$(full_name "$name")"
      secret_exists "$full" || missing+=("$full (no secret)")
      if [ "${kind:-}" = "required" ]; then
        v="$(yaml_value "$name" || true)"
        is_usable_required_value "$v" || missing+=("$name (required, no usable value in YAML)")
      fi
    done < "$CATALOG"
  else
    while IFS="$(printf '\t')" read -r name _; do
      full="$(full_name "$name")"; secret_exists "$full" || missing+=("$full (no secret)")
    done < "$PARSED"
  fi
  if [ "${#missing[@]}" -gt 0 ]; then
    echo "✗ ${#missing[@]} problem(s):" >&2; printf '   - %s\n' "${missing[@]}" >&2; exit 1
  fi
  echo "✓ all secrets present${STACK:+ for stack '$STACK'}."; exit 0
fi

# ── mode: --rotate <names> ────────────────────────────────────────────────────
if [ "$MODE" = "rotate" ]; then
  # Preflight: validate EVERY target BEFORE mutating any secret, so a typo/invalid
  # value in a later target can't leave an earlier one already rotated (partial set).
  for name in "${ROTATE_TARGETS[@]}"; do
    yaml_has "$name" || { echo "  ✗ '$name' not in $FILE — aborting (nothing rotated)." >&2; exit 1; }
    if [ "$(catalog_kind "$name")" = "required" ] && ! is_usable_required_value "$(yaml_value "$name")"; then
      echo "  ✗ required '$name' has no usable value in $FILE — aborting (nothing rotated)." >&2; exit 1
    fi
  done
  # Mutate: every target validated above.
  for name in "${ROTATE_TARGETS[@]}"; do
    full="$(full_name "$name")"
    v="$(yaml_value "$name")"; [ -n "$v" ] || v="$SENTINEL"
    if secret_exists "$full"; then
      if ! docker secret rm "$full" >/dev/null 2>&1; then
        echo "  ✗ '$full' is in use — detach it from consuming services first (docker service update --secret-rm '$full' <svc>), or remove the stack that mounts it, then re-run." >&2; exit 1
      fi
      echo "  ↻ removed '$full'"
    fi
    create_secret "$full" "$v"; echo "  ✓ set '$full'"
  done
  echo "✓ rotate complete.${STACK:+ (stack: $STACK)}"; exit 0
fi

# ── mode: apply (default) — create missing, report drift ──────────────────────
echo "Syncing secrets from $FILE${STACK:+ (stack: $STACK)}"
created=0; drift=0

process_one() {  # name, value, kind
  local name="$1" v="$2" kind="${3:-}"
  local full; full="$(full_name "$name")"
  if [ -z "$v" ] || [ "$v" = "$SENTINEL" ]; then v="$SENTINEL"; fi
  if secret_exists "$full"; then
    local cur; cur="$(existing_hash "$full")"
    local rotatecmd="$0 --file $FILE${CATALOG:+ --catalog $CATALOG}${STACK:+ --stack $STACK} --rotate $name"
    if [ -z "$cur" ]; then
      # No content label (created outside this tool / older version): we CAN'T
      # compare values, so don't claim it's in sync. Rotate once to add the label.
      echo "  ? '$full' has no content label — drift can't be verified; rotate once to add one: $rotatecmd"
    else
      # NB: use `if`, not `[ … ] && { … }`. Under `set -e`, when the secret is in
      # sync the `[ … ]` test returns 1, which would become process_one's exit
      # status and abort the whole (idempotent) run — breaking every redeploy after
      # the first. `if … fi` returns 0 when the condition is false.
      local want; want="$(content_hash "$v")"
      if [ "$cur" != "$want" ]; then
        echo "  ~ '$full' DRIFT (deployed≠YAML) — run: $rotatecmd"; drift=$((drift+1))
      fi
    fi
  else
    create_secret "$full" "$v"
    if [ "$v" = "$SENTINEL" ]; then echo "  ⊘ '$full' created disabled (${SENTINEL})"; else echo "  ✓ '$full' created"; fi
    created=$((created+1))
  fi
  return 0   # never let the last command's status abort `set -e` at the call site
}

if [ -n "$CATALOG" ]; then
  while read -r name kind _; do
    [ -n "${name:-}" ] || continue
    case "$name" in \#*) continue;; esac
    v="$(yaml_value "$name" || true)"
    # A required secret must have a usable value (not empty, __DISABLED__, or the
    # CHANGE_ME placeholder) — hard error, matching --check; never create a bad secret.
    if [ "${kind:-}" = "required" ] && ! is_usable_required_value "$v"; then
      echo "  ✗ required '$name' has no usable value in $FILE (empty, ${SENTINEL}, or CHANGE_ME placeholder) — not creating a bad secret." >&2; exit 1
    fi
    process_one "$name" "$v" "$kind"
  done < "$CATALOG"
  # warn on YAML keys not declared in the catalog (typo guard)
  while IFS="$(printf '\t')" read -r name _; do
    awk -v k="$name" '$1==k{f=1} END{exit !f}' "$CATALOG" 2>/dev/null || \
      echo "  ! '$name' in YAML is not in the catalog (ignored — typo?)"
  done < "$PARSED"
else
  while IFS="$(printf '\t')" read -r name v; do process_one "$name" "$v" ""; done < "$PARSED"
fi

echo "✓ done — ${created} created, ${drift} drifted.${STACK:+ (stack: $STACK)}"
