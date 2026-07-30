#!/usr/bin/env sh
# Run from the directory the deploy pipeline scp'd these files into (docker-stack.yml,
# docker-stack.base.yml, scripts/). Deploys the shared base tier (one Dozzle) if
# missing, provisions this env's Swarm secrets from its on-box secrets.yaml, then
# deploys the env app stack.
set -eu

required_vars="
STACK_NAME
APP_DOMAIN
API_IMAGE
EXPERIENCE_IMAGE
SHELL_IMAGE
"

for var_name in $required_vars; do
  eval "var_value=\${$var_name:-}"
  if [ -z "$var_value" ]; then
    echo "Missing required environment variable: $var_name" >&2
    exit 1
  fi
done

# ── 0) Shared base tier — one Dozzle for the whole VPS (fleet rule). Bootstrap it
#    if missing; otherwise leave it alone so a routine app deploy never restarts the
#    shared log viewer. Force an update with REDEPLOY_BASE=true.
if docker stack ls --format '{{.Name}}' | grep -qx metrohub-base; then
  base_present=1
else
  base_present=0
fi
if [ "$base_present" = 0 ] || [ "${REDEPLOY_BASE:-false}" = "true" ]; then
  echo "Deploying shared base tier (metrohub-base: one Dozzle)…"
  docker stack deploy -c docker-stack.base.yml metrohub-base
else
  echo "metrohub-base already present — leaving the shared Dozzle untouched (set REDEPLOY_BASE=true to update it)."
fi

# ── 1) Provision this env's Swarm secrets from its server-local secrets.yaml
#    (namespaced <stack>_<name>), then gate the deploy fail-closed.
SEC="/opt/money-money/shared/${STACK_NAME}.secrets.yaml"
bash scripts/sync-secrets.sh --file "$SEC" --catalog scripts/secrets.catalog --stack "$STACK_NAME"
bash scripts/sync-secrets.sh --file "$SEC" --catalog scripts/secrets.catalog --stack "$STACK_NAME" --check

# ── 2) Deploy this env's app stack. --prune removes services no longer in the
#    compose file (e.g. the per-env Dozzle that moved to the shared base tier);
#    without it a removed service lingers.
CORS_ORIGINS="${CORS_ORIGINS:-}"
export STACK_NAME APP_DOMAIN API_IMAGE EXPERIENCE_IMAGE SHELL_IMAGE CORS_ORIGINS
docker stack deploy --with-registry-auth --prune -c docker-stack.yml "$STACK_NAME"

docker service ls --filter "label=com.docker.stack.namespace=$STACK_NAME"
