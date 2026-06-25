# JavaScript Application Architecture

The JavaScript workspace uses pnpm and is split into three application layers.

## API

- Path: `js/apps/api`
- Framework: NestJS
- Responsibility: domain APIs, persistence, integrations, background jobs, and server-side business workflows.

## Experience

- Path: `js/apps/experience`
- Framework: Next.js
- Responsibility: experience-layer behavior, UI-specific API composition, request shaping, authentication handoff, and server-rendered routes where needed.

## UI

- Path: `js/apps/ui`
- Framework: React
- Responsibility: browser-facing screens, components, client state, and user interactions.

## Shared Packages

- Path: `js/packages/*`
- Responsibility: reusable TypeScript libraries shared by the API, experience, and UI apps.
