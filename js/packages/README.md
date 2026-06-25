# Packages

Each direct child of this folder is its own pnpm package. Packages can be micro apps shown in the portal or reusable TypeScript libraries shared across apps.

Micro apps should expose portal metadata, including:

- Display name
- Category
- Route or entry point
- Tile title and description
- Optional icon or visual asset reference

Initial micro-app examples:

| Package | Display name | Category |
| --- | --- | --- |
| `poker-scorecard` | Poker scorecard | Scoreboard |
| `rummy-scorecard` | Rummy scorecard | Scoreboards |
| `splits` | Splits | Accounting |
| `my-accounts` | My Accounts | Accounting |
| `deals` | Deals | Shopping |
| `near-by` | Near By | Site Seeing |
