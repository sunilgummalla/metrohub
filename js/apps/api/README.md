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

The service exposes `GET /health` on port **3000** by default (overridable via the `PORT` environment variable).

## Game State SSE endpoints

These endpoints power the real-time share/read-only feature in Tambola, Bingo, and Rummy.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/game/:id` | Host pushes a new state snapshot (UUID v4 game ID required; max 64 KB payload) |
| `GET` | `/api/game/:id` | Read-only viewer fetches the latest snapshot on first load |
| `GET` | `/api/game/:id/stream` | SSE stream — viewer subscribes for live updates (30 s keepalive) |

> **Scaling note:** Game state is stored in-memory. This works correctly only when the API runs as a single replica. Scale-out requires sticky routing or a shared store (e.g. Redis Pub/Sub).
