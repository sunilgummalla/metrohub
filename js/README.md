# JavaScript Workspace

JavaScript and TypeScript projects live here and use pnpm.

- API: `apps/api` using NestJS.
- Experience: `apps/experience` using Next.js.
- UI portal shell: `apps/ui` using React.
- Micro apps: `packages/micro-apps/*` as separate pnpm packages.
- Shared packages: `packages/shared/*`

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
- `packages/micro-apps/*` contains independently packaged micro apps. Each micro app should expose portal metadata such as display name, category, route, and tile details.
- `packages/shared/*` should hold reusable TypeScript libraries shared across apps and micro apps.
