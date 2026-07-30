#!/usr/bin/env bash
#
# Mongo first-init — runs ONCE, only when the shared data volume is EMPTY, via
# /docker-entrypoint-initdb.d. Creates a least-privilege application user PER
# ENVIRONMENT on the `admin` database (so one authSource=admin credential reaches
# each env's app db) with readWrite on that env's db.
#
# Root is created by the mongo image from MONGO_INITDB_ROOT_*_FILE and is NOT used
# by any app at runtime. App users come from MONGO_APP_USERS — a space-separated
# list of `<db>:<user_file>:<pass_file>` triples (files are /run/secrets/...).
#
# Adding a NEW env later (after the volume is populated) does NOT re-run this; add
# that user once by hand as root, e.g. mongosh -u <root> --authenticationDatabase
# admin --eval 'db.getSiblingDB("admin").createUser(...)'.
set -euo pipefail

resolve() {
  local var="$1" fvar="${1}_FILE"
  if [ -n "${!var:-}" ]; then printf '%s' "${!var}"
  elif [ -n "${!fvar:-}" ] && [ -r "${!fvar}" ]; then tr -d '\r\n' < "${!fvar}"
  fi
}

ROOT_U="$(resolve MONGO_INITDB_ROOT_USERNAME)"
ROOT_P="$(resolve MONGO_INITDB_ROOT_PASSWORD)"
: "${ROOT_U:?root username required (env or _FILE)}"
: "${ROOT_P:?root password required (env or _FILE)}"
: "${MONGO_APP_USERS:?MONGO_APP_USERS required (\"<db>:<user_file>:<pass_file> ...\")}"

export ROOT_U ROOT_P

for triple in $MONGO_APP_USERS; do
  db="${triple%%:*}"; rest="${triple#*:}"; user_file="${rest%%:*}"; pass_file="${rest##*:}"
  [ -n "$db" ] && [ -n "$user_file" ] && [ -n "$pass_file" ] || { echo "[mongo-init] bad triple: '$triple'" >&2; exit 1; }
  [ -r "$user_file" ] || { echo "[mongo-init] user file not readable: $user_file" >&2; exit 1; }
  [ -r "$pass_file" ] || { echo "[mongo-init] pass file not readable: $pass_file" >&2; exit 1; }

  APP_U="$(tr -d '\r\n' < "$user_file")"
  APP_P="$(tr -d '\r\n' < "$pass_file")"
  # Fail fast on an empty secret file — otherwise mongosh would try to create a
  # user with an empty username/password and fail in a confusing way downstream.
  [ -n "$APP_U" ] || { echo "[mongo-init] empty app username (file: $user_file)" >&2; exit 1; }
  [ -n "$APP_P" ] || { echo "[mongo-init] empty app password (file: $pass_file)" >&2; exit 1; }
  APP_DB="$db"
  export APP_U APP_P APP_DB

  # Authenticate + create/update INSIDE the single-quoted heredoc via process.env,
  # so no credential ever appears in the container's process argv (`ps`,
  # /proc/<pid>/cmdline). One mongosh invocation per app user.
  mongosh --quiet --host 127.0.0.1 --port 27017 <<'EOF'
const admin = db.getSiblingDB('admin');
if (!admin.auth(process.env.ROOT_U, process.env.ROOT_P)) {
  throw new Error('[mongo-init] root authentication failed');
}
const user = process.env.APP_U;
const pwd = process.env.APP_P;
const appDb = process.env.APP_DB;
const roles = [{ role: 'readWrite', db: appDb }];
const info = admin.runCommand({ usersInfo: user });
const exists = info.users && info.users.some((u) => u.user === user);
if (exists) {
  admin.updateUser(user, { pwd, roles });
  print(`[mongo-init] updated app user '${user}' (readWrite on ${appDb})`);
} else {
  admin.createUser({ user, pwd, roles });
  print(`[mongo-init] created app user '${user}' (readWrite on ${appDb})`);
}
EOF
done
