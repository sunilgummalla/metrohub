# JavaScript Application Architecture

The JavaScript workspace uses pnpm and is split into three application layers.

## Backend

- Path: `js/apps/backend`
- Framework: NestJS
- Responsibility: domain APIs, persistence, integrations, background jobs, and server-side business workflows.

## BFF

- Path: `js/apps/bff`
- Framework: Next.js
- Responsibility: backend-for-frontend behavior, UI-specific API composition, request shaping, authentication handoff, and server-rendered routes where needed.

## UI

- Path: `js/apps/ui`
- Framework: React
- Responsibility: browser-facing screens, components, client state, and user interactions.

## Shared Packages

- Path: `js/packages/*`
- Responsibility: reusable TypeScript libraries shared by the backend, BFF, and UI apps.
