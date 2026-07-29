# JavaScript Workspace

JavaScript and TypeScript projects live here and use pnpm.

- API: `apps/api` using NestJS.
- Experience: `apps/experience` using Next.js.
- Shell: `apps/shell` using React.
- Micro apps and shared libraries: `packages/*` as separate pnpm packages.

Common commands:

```powershell
cd js
pnpm install
pnpm build
pnpm test
```

## App Boundaries

- `apps/api` owns domain APIs, persistence, integrations, background jobs, and server-side business workflows.
- `apps/api` also owns the JSON app registry listing supported Money-Money apps.
- `apps/experience` owns request shaping for client experiences, UI-specific API composition, authentication handoff, server-rendered Next.js routes where needed, and fetching the supported app registry from the API.
- `apps/shell` owns the React shell, sticky header, sticky footer, tile grid, category navigation, and clickable entry points for micro apps.
- `packages/*` contains independently packaged micro apps and shared TypeScript libraries. Micro-app folders use the `app-` prefix, but package names use the internal `@metrohub` namespace. Each micro app should expose portal metadata such as display name, category, route, and tile details.

Initial micro-app examples:

- Poker scorecard: Scoreboard
- Rummy scorecard: Scoreboards
- Splits: Accounting
- My Accounts: Accounting
- Deals: Shopping
- Near By: Site Seeing
