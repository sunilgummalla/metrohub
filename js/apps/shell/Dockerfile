FROM node:22-alpine AS build

WORKDIR /workspace/js
RUN corepack enable

COPY js/package.json js/pnpm-lock.yaml js/pnpm-workspace.yaml ./
COPY js/apps/shell/package.json apps/shell/package.json
RUN pnpm install --frozen-lockfile

COPY js/apps/shell apps/shell
RUN pnpm --filter @money-money/shell build

FROM nginx:1.27-alpine AS runtime

COPY js/apps/shell/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/js/apps/shell/dist /usr/share/nginx/html

EXPOSE 80
