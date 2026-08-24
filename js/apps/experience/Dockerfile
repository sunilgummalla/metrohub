FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS build

WORKDIR /workspace/js
ARG PNPM_VERSION=9.15.9
# Warm-store support: pin the pnpm store to a fixed path so a BuildKit cache
# mount can persist it across builds. NPM_REGISTRY defaults to npmjs; point it
# at a pull-through mirror (e.g. Verdaccio) from CI to warm cold installs too.
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate \
  && pnpm config set store-dir /pnpm/store --global \
  && pnpm config set registry "$NPM_REGISTRY" --global

COPY js/package.json js/pnpm-lock.yaml js/pnpm-workspace.yaml ./
COPY js/apps/experience/package.json apps/experience/package.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY js/apps/experience apps/experience
RUN pnpm --filter @metrohub/experience build \
  && pnpm --filter @metrohub/experience deploy --prod /prod/experience \
  && cp -R apps/experience/.next /prod/experience/.next

FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS runtime

ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

ARG PNPM_VERSION=9.15.9
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
COPY --from=build /prod/experience /app

EXPOSE 3000
CMD ["pnpm", "start"]
