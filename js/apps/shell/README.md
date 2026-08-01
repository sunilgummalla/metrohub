# Shell

The React shell for MetroHub lives here.

This app hosts multiple micro apps. Each micro app appears as a clickable tile in the shell and is grouped by category.

The shell owns the sticky header, sticky footer, category navigation, tile rendering, micro-app entry routing, client state, and user interactions.

MetroHub is the application name. (Formerly code-named money-money.)

## Local development

```powershell
cd js
pnpm install
pnpm --filter @metrohub/shell dev
```

The Vite app runs on port `3002` by default.
