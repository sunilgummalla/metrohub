# API

NestJS API services live here.

This app owns domain APIs, persistence, integrations, background jobs, server-side business workflows, and the JSON app registry.

The app registry starts in `app-registry.json`. The API should expose it to the experience layer as the list of supported Money-Money apps.

## Local development

```powershell
cd js
pnpm install
pnpm --filter @money-money/api dev
```

The service exposes `GET /health` on port `3001` by default.
