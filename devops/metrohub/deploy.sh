#!/usr/bin/env sh
set -eu

required_vars="
STACK_NAME
APP_DOMAIN
API_IMAGE
EXPERIENCE_IMAGE
SHELL_IMAGE
DOZZLE_PORT
"

for var_name in $required_vars; do
  eval "var_value=\${$var_name:-}"
  if [ -z "$var_value" ]; then
    echo "Missing required environment variable: $var_name" >&2
    exit 1
  fi
done

if [ -z "${CLOUDFLARED_TOKEN_FILE:-}" ] && [ -z "${CLOUDFLARED_TOKEN:-}" ]; then
  echo "Missing required environment variable: CLOUDFLARED_TOKEN_FILE or CLOUDFLARED_TOKEN" >&2
  exit 1
fi

deploy_dir="${DEPLOY_DIR:-${HOME}/money-money}/${STACK_NAME}"
mkdir -p "$deploy_dir"
cp docker-stack.yml "$deploy_dir/docker-stack.yml"

secret_name="${STACK_NAME}_cloudflare_tunnel_token"
if ! docker secret inspect "$secret_name" >/dev/null 2>&1; then
  if [ -n "${CLOUDFLARED_TOKEN_FILE:-}" ]; then
    docker secret create "$secret_name" "$CLOUDFLARED_TOKEN_FILE" >/dev/null
  else
    printf '%s' "$CLOUDFLARED_TOKEN" | docker secret create "$secret_name" - >/dev/null
  fi
fi

CORS_ORIGINS="${CORS_ORIGINS:-}"
export STACK_NAME APP_DOMAIN API_IMAGE EXPERIENCE_IMAGE SHELL_IMAGE DOZZLE_PORT CORS_ORIGINS
docker stack deploy --with-registry-auth -c "$deploy_dir/docker-stack.yml" "$STACK_NAME"

docker service ls --filter "label=com.docker.stack.namespace=$STACK_NAME"
