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

## UI Portal

- Path: `js/apps/ui`
- Framework: React
- Responsibility: portal shell, category navigation, micro-app tile rendering, micro-app entry routing, client state, and user interactions.

The portal hosts multiple micro apps. Each micro app appears as a tile in the UI and is grouped by category.

## Micro Apps

- Path: `js/packages/*`
- Framework: React by default unless an app needs a different client runtime.
- Responsibility: separately packaged portal features that expose metadata for display name, category, route, tile content, and optional visual assets.

Micro-app folder names use the `app-` prefix so they group together under `js/packages`. The `app-` prefix is only for folder names; package names use the internal `@money` namespace.

Example micro apps and categories:

- Poker scorecard: Scoreboard
- Rummy scorecard: Scoreboards
- Splits: Accounting
- My Accounts: Accounting
- Deals: Shopping
- Near By: Site Seeing

## Shared Packages

- Path: `js/packages/*`
- Responsibility: reusable TypeScript libraries shared by the API, experience layer, portal shell, and micro apps.
