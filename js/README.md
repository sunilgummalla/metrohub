# JavaScript Workspace

JavaScript and TypeScript projects live here and use pnpm.

- Backend: `apps/backend` using NestJS.
- BFF: `apps/bff` using Next.js as the backend-for-frontend layer.
- UI: `apps/ui` using React.
- Shared packages: `packages/*`

Common commands:

```powershell
cd js
pnpm install
pnpm build
pnpm test
```

## App Boundaries

- `apps/backend` owns domain APIs, persistence, integrations, background jobs, and server-side business workflows.
- `apps/bff` owns request shaping for client experiences, UI-specific API composition, authentication handoff, and server-rendered Next.js routes where needed.
- `apps/ui` owns browser-facing React screens, components, client state, and user interactions.
- `packages/*` should hold reusable TypeScript libraries shared across apps.
