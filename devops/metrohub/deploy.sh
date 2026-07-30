#!/usr/bin/env sh
# Run from the directory the deploy pipeline scp'd these files into (docker-stack.yml,
# docker-stack.base.yml, mongo-init/, scripts/). Deploys the shared base tier (one
# Mongo + one Dozzle) if missing, provisions this env's Swarm secrets from its
# on-box secrets.yaml, then deploys the env app stack.
set -eu

required_vars="
STACK_NAME
APP_DOMAIN
API_IMAGE
EXPERIENCE_IMAGE
SHELL_IMAGE
MONGO_DB
"

for var_name in $required_vars; do
  eval "var_value=\${$var_name:-}"
  if [ -z "$var_value" ]; then
    echo "Missing required environment variable: $var_name" >&2
    exit 1
  fi
done

# ── 0) Shared base tier — one Mongo + one Dozzle for the whole VPS (fleet rule).
#    The shared Mongo is used by BOTH envs, so a routine app deploy must NOT touch
#    it. Deploy metrohub-base ONLY when missing (bootstrap) or on REDEPLOY_BASE=true.
#    It creates the per-env data overlays (mh-{dev,prod}-data) + the app users, so
#    `mongo` is resolvable when the env app stack starts.
if docker stack ls --format '{{.Name}}' | grep -qx metrohub-base; then
  base_present=1
else
  base_present=0
fi
if [ "$base_present" = 0 ] || [ "${REDEPLOY_BASE:-false}" = "true" ]; then
  echo "Deploying shared base tier (metrohub-base: Mongo + Dozzle)…"
  BASE_SEC="/opt/money-money/shared/metrohub-base.secrets.yaml"
  bash scripts/sync-secrets.sh --file "$BASE_SEC" --catalog scripts/secrets.base.catalog --stack metrohub-base
  bash scripts/sync-secrets.sh --file "$BASE_SEC" --catalog scripts/secrets.base.catalog --stack metrohub-base --check
  MONGO_INIT_SHA="$(sha256sum mongo-init/010-create-app-users.sh | cut -c1-12)"
  MONGO_INIT_SHA="$MONGO_INIT_SHA" \
    docker stack deploy --with-registry-auth -c docker-stack.base.yml metrohub-base
else
  echo "metrohub-base already present — leaving the shared Mongo/Dozzle untouched (set REDEPLOY_BASE=true to update it)."
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
