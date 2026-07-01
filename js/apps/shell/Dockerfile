FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS build

WORKDIR /workspace/js
ARG PNPM_VERSION=9.15.9
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY js/package.json js/pnpm-lock.yaml js/pnpm-workspace.yaml ./
COPY js/apps/shell/package.json apps/shell/package.json
RUN pnpm install --frozen-lockfile

COPY js/apps/api/app-registry.json apps/api/app-registry.json
COPY js/apps/shell apps/shell
RUN pnpm --filter @money-money/shell build

FROM nginx:1.27-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10 AS runtime

COPY js/apps/shell/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/js/apps/shell/dist /usr/share/nginx/html

EXPOSE 80
