# Packages

Each direct child of this folder is its own pnpm package. Packages can be micro apps shown in the portal or reusable TypeScript libraries shared across apps.

Micro-app folder names use the `app-` prefix so they group together in file listings. The prefix is only for folder names. Package names use the internal `@metrohub` namespace and are private repo-only packages that are not published to a package store.

Micro apps expose portal metadata using the shared `PortalAppMetadata` contract in `shared/src/portal-metadata.ts`, including:

- Display name
- Category
- Route or entry point
- Tile title and description
- Optional icon or visual asset reference

Initial micro-app examples:

| Folder | Package | Display name | Category |
| --- | --- | --- | --- |
| `app-poker-scorecard` | `@metrohub/poker-scorecard` | Poker scorecard | Scoreboard |
| `app-rummy-scorecard` | `@metrohub/rummy-scorecard` | Rummy scorecard | Scoreboards |
| `app-splits` | `@metrohub/splits` | Splits | Accounting |
| `app-my-accounts` | `@metrohub/my-accounts` | My Accounts | Accounting |
| `app-deals` | `@metrohub/deals` | Deals | Shopping |
| `app-near-by` | `@metrohub/near-by` | Near By | Site Seeing |

These packages are currently empty placeholders until their app implementations are defined.
