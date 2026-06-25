# JavaScript Workspace

JavaScript and TypeScript projects live here and use pnpm.

- API: `apps/api` using NestJS.
- Experience: `apps/experience` using Next.js.
- UI portal shell: `apps/ui` using React.
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
- `apps/experience` owns request shaping for client experiences, UI-specific API composition, authentication handoff, and server-rendered Next.js routes where needed.
- `apps/ui` owns the React portal shell, including the tile grid and category navigation for micro apps.
- `packages/*` contains independently packaged micro apps and shared TypeScript libraries. Each micro app should expose portal metadata such as display name, category, route, and tile details.

Initial micro-app examples:

- Poker scorecard: Scoreboard
- Rummy scorecard: Scoreboards
- Splits: Accounting
- My Accounts: Accounting
- Deals: Shopping
- Near By: Site Seeing
