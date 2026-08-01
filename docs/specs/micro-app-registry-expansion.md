# Micro-App Registry Expansion

Based on the engagement, monetization, and marketplace roadmaps, the MetroHub platform requires the scaffolding of several new micro-apps within the `js/packages/` workspace.

These packages will be registered in the API's JSON registry and dynamically loaded by the shell.

## 1. Engagement & Social Utilities

| Package Name | Category | Purpose |
|---|---|---|
| `app-game-night` | Social | Event RSVP, logistics, and potluck planner. Integrates impulse buys for snacks/drinks. |
| `app-events` | Local | Discovery and ticketing for local community events. |
| `app-tournaments` | Scoreboards | Long-term leaderboards and league management for Poker/Rummy groups. |
| `app-decider` | Utility | "Snack Roulette" spinner for group decision-making, heavily weighted toward portal purchases. |
| `app-group-buy` | Accounting | Tool for pooling money for shared gifts or large purchases, fulfilling directly via the portal. |

## 2. Monetization & Content

| Package Name | Category | Purpose |
|---|---|---|
| `app-news-ticker` | Content | The scrolling news feed component (local/international). While technically a shell component, it may be packaged independently for reusability. |

## 3. Portals & Marketplaces

*Note: While the Advertiser and Admin portals are standalone applications or distinct routing domains, the internal features may be structured as packages.*

| Package Name | Category | Purpose |
|---|---|---|
| `app-advertiser-dashboard` | Business | The self-serve inventory purchasing dashboard, live heatmaps, and campaign analytics. |
| `app-influencer-directory` | Business | The discovery and matchmaking interface for businesses to find and pitch local creators. |
| `app-creator-hub` | Creator | The interface for influencers to manage their profile, link social accounts, and manage incoming deal flow. |

## 4. AI Integration

| Service | Architecture | Purpose |
|---|---|---|
| `ai-business-assistant` | Python (`py/`) | The Chainlit-powered AI assistant that connects to the MongoDB presence/campaign data and answers advertiser queries via the Member Portal. |

## Scaffolding Strategy

Each new React-based micro-app will follow the established pattern:
1.  Created under `js/packages/<folder-name>`.
2.  Exports metadata (display name, category, route, tile).
3.  Registered in `js/apps/api/src/.../app-registry.json`.
4.  Fetched by the Next.js experience layer and rendered by the React shell.
