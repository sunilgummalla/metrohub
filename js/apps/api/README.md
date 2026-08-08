# API

NestJS API services live here.

This app owns domain APIs, persistence, integrations, background jobs, server-side business workflows, and the app registry.

The app registry is Mongo-backed. Its canonical definition lives in [`src/seed/app-catalog.ts`](src/seed/app-catalog.ts); `SeedService` upserts it into the `apps` collection on boot (when `SEED_SAMPLE_DATA=true`), and the API exposes it to the experience layer at `GET /api/home/apps`. To add an app, append an entry to the catalog and wire its component in the shell.

## Local development

```powershell
cd js
pnpm install
pnpm --filter @metrohub/api dev
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
