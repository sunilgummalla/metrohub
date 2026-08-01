FROM node:22-alpine AS install

WORKDIR /app

RUN npm install -g pnpm

COPY js/package.json .
COPY js/pnpm-workspace.yaml .
COPY js/pnpm-lock.yaml .

COPY js/apps/member/package.json apps/member/package.json
COPY js/packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

# ─── Build stage ──────────────────────────────────────────────────────────
FROM install AS build

COPY js/apps/member apps/member
COPY js/packages/shared packages/shared

RUN pnpm --filter @metrohub/member build

# ─── Production stage ─────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS prod

COPY --from=build /app/apps/member/dist /usr/share/nginx/html
COPY js/apps/member/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
