FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS build

WORKDIR /workspace/js
ARG PNPM_VERSION=9.15.9
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY js/package.json js/pnpm-lock.yaml js/pnpm-workspace.yaml ./
COPY js/apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile

COPY js/apps/api apps/api
RUN pnpm --filter @money-money/api build \
  && pnpm --filter @money-money/api deploy --prod /prod/api

FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS runtime

ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

ARG PNPM_VERSION=9.15.9
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
COPY --from=build /prod/api /app

EXPOSE 3000
CMD ["pnpm", "start"]
