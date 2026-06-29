FROM node:22-alpine AS build

WORKDIR /workspace/js
RUN corepack enable

COPY js/package.json js/pnpm-lock.yaml js/pnpm-workspace.yaml ./
COPY js/apps/experience/package.json apps/experience/package.json
RUN pnpm install --frozen-lockfile

COPY js/apps/experience apps/experience
RUN pnpm --filter @money-money/experience build

FROM node:22-alpine AS runtime

WORKDIR /workspace/js
ENV NODE_ENV=production
ENV PORT=3000

RUN corepack enable
COPY --from=build /workspace/js /workspace/js

EXPOSE 3000
CMD ["pnpm", "--filter", "@money-money/experience", "start"]
