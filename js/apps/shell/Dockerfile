FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS build

WORKDIR /workspace/js
ARG PNPM_VERSION=9.15.9
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY js/package.json js/pnpm-lock.yaml js/pnpm-workspace.yaml ./
COPY js/apps/shell/package.json apps/shell/package.json
COPY js/packages/app-poker-scorecard/package.json packages/app-poker-scorecard/package.json
COPY js/packages/app-rummy-scorecard/package.json packages/app-rummy-scorecard/package.json
COPY js/packages/app-tambola/package.json packages/app-tambola/package.json
COPY js/packages/app-bingo/package.json packages/app-bingo/package.json
COPY js/packages/app-housing-loan/package.json packages/app-housing-loan/package.json
COPY js/packages/app-plans/package.json packages/app-plans/package.json
COPY js/packages/shared/package.json packages/shared/package.json
COPY js/packages/app-marketplace/package.json packages/app-marketplace/package.json
RUN pnpm install --frozen-lockfile

COPY js/apps/shell apps/shell
COPY js/packages/app-poker-scorecard packages/app-poker-scorecard
COPY js/packages/app-rummy-scorecard packages/app-rummy-scorecard
COPY js/packages/app-tambola packages/app-tambola
COPY js/packages/app-bingo packages/app-bingo
COPY js/packages/app-housing-loan packages/app-housing-loan
COPY js/packages/app-plans packages/app-plans
COPY js/packages/shared packages/shared
COPY js/packages/app-marketplace packages/app-marketplace
RUN pnpm --filter @metrohub/shell build

FROM nginx:1.27-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10 AS runtime

COPY js/apps/shell/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/js/apps/shell/dist /usr/share/nginx/html

EXPOSE 80
