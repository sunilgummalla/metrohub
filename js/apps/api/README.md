# API

NestJS API services live here.

This app owns domain APIs, persistence, integrations, background jobs, and server-side business workflows.

## Local development

```powershell
cd js
pnpm install
pnpm --filter @money-money/api dev
```

The service exposes `GET /health` on port `3001` by default.
