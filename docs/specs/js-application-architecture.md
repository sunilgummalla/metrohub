# JavaScript Application Architecture

The JavaScript workspace uses pnpm and is split into three application layers.

## API

- Path: `js/apps/api`
- Framework: NestJS
- Responsibility: domain APIs, persistence, integrations, background jobs, server-side business workflows, and the JSON app registry.

The API owns the JSON-based app registry. It exposes the supported app list to the experience layer.

## Experience

- Path: `js/apps/experience`
- Framework: Next.js
- Responsibility: experience-layer behavior, UI-specific API composition, request shaping, authentication handoff, server-rendered routes where needed, and fetching the supported app list from the API.

The experience layer calls the API for the supported app registry and passes the app list to the shell.

## Shell

- Path: `js/apps/shell`
- Framework: React
- Responsibility: host shell, sticky header, sticky footer, category navigation, micro-app tile rendering, micro-app entry routing, client state, and user interactions.

The shell hosts multiple micro apps for MetroHub. Each micro app appears as a clickable tile and is grouped by category.

## App Registry Flow

1. The API maintains a JSON registry of supported apps.
2. The experience layer calls the API and gets the supported app list.
3. The shell renders one clickable tile for each app, organized by category.
4. The shell keeps the MetroHub header and footer sticky while users browse app categories.

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
- Responsibility: reusable TypeScript libraries shared by the API, experience layer, shell, and micro apps.
