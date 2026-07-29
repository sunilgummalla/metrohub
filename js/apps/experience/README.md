# Experience

Next.js experience-layer shell app lives here.

This app owns UI-focused API composition, request shaping, authentication handoff, and server-rendered routes where needed.

The experience layer calls the API for the supported app registry and passes that app list to the shell.

## Local development

```powershell
cd js
pnpm install
pnpm --filter @metrohub/experience dev
```

The app runs on Next.js with the App Router under `src/app`.
