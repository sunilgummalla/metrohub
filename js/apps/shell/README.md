# Shell

The React shell for Money-Money lives here.

This app hosts multiple micro apps. Each micro app appears as a clickable tile in the shell and is grouped by category.

The shell owns the sticky header, sticky footer, category navigation, tile rendering, micro-app entry routing, client state, and user interactions.

Money-Money is the current app code name and may change in the future.

## Local development

```powershell
cd js
pnpm install
pnpm --filter @money-money/shell dev
```

The Vite app runs on port `3002` by default.
