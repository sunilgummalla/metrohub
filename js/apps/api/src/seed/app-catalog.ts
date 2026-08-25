/**
 * Canonical MetroHub app catalog — the single source of truth for the shell's
 * micro-app registry. Seeded into the `apps` collection by SeedService and
 * exposed at `GET /api/home/apps`. The shell reads this list at boot and binds
 * each `id` to its bundled React component.
 *
 * To add an app: append an entry here (and wire its component in the shell).
 */
export interface AppCatalogEntry {
  id: string;
  packageName: string;
  folder: string;
  displayName: string;
  category: string;
  route: string;
  icon: string;
  tile: { title: string; description: string };
}

export const APP_CATALOG: AppCatalogEntry[] = [
  {
    id: "poker-scorecard",
    packageName: "@metrohub/poker-scorecard",
    folder: "app-poker-scorecard",
    displayName: "Poker scorecard",
    category: "Scoreboards",
    route: "/apps/poker-scorecard",
    icon: "♠️",
    tile: { title: "Poker scorecard", description: "Track poker game scores." },
  },
  {
    id: "rummy-scorecard",
    packageName: "@metrohub/rummy-scorecard",
    folder: "app-rummy-scorecard",
    displayName: "Rummy scorecard",
    category: "Scoreboards",
    route: "/apps/rummy-scorecard",
    icon: "🃏",
    tile: { title: "Rummy scorecard", description: "Track rummy game scores." },
  },
  {
    id: "tambola",
    packageName: "@metrohub/tambola",
    folder: "app-tambola",
    displayName: "Tambola",
    category: "Scoreboards",
    route: "/apps/tambola",
    icon: "🎱",
    tile: { title: "Tambola", description: "Indian Housie number caller with stories (1–90)." },
  },
  {
    id: "bingo",
    packageName: "@metrohub/bingo",
    folder: "app-bingo",
    displayName: "Bingo",
    category: "Scoreboards",
    route: "/apps/bingo",
    icon: "🎯",
    tile: { title: "Bingo", description: "Classic Bingo caller with Indian stories (1–75)." },
  },
  {
    id: "splits",
    packageName: "@metrohub/splits",
    folder: "app-splits",
    displayName: "Splits",
    category: "Accounting",
    route: "/apps/splits",
    icon: "⚖️",
    tile: { title: "Splits", description: "Split shared expenses." },
  },
  {
    id: "my-accounts",
    packageName: "@metrohub/my-accounts",
    folder: "app-my-accounts",
    displayName: "My Accounts",
    category: "Accounting",
    route: "/apps/my-accounts",
    icon: "🏦",
    tile: { title: "My Accounts", description: "Review personal account information." },
  },
  {
    id: "housing-loan",
    packageName: "@metrohub/housing-loan",
    folder: "app-housing-loan",
    displayName: "Housing Loan Calculator",
    category: "Accounting",
    route: "/apps/housing-loan",
    icon: "🏡",
    tile: { title: "Housing Loan Calculator", description: "Estimate mortgage payments, interest, and amortization." },
  },
  {
    id: "deals",
    packageName: "@metrohub/deals",
    folder: "app-deals",
    displayName: "Deals",
    category: "Shopping",
    route: "/apps/deals",
    icon: "🏷️",
    tile: { title: "Deals", description: "Find shopping deals." },
  },
  {
    id: "plans",
    packageName: "@metrohub/plans",
    folder: "app-plans",
    displayName: "Plans & Pricing",
    category: "Account",
    route: "/plans",
    icon: "💳",
    tile: { title: "Plans & Pricing", description: "View subscription plans and pricing." },
  },
  {
    id: "marketplace",
    packageName: "@metrohub/marketplace",
    folder: "app-marketplace",
    displayName: "Marketplace",
    category: "Marketplace",
    route: "/marketplace",
    icon: "🏪",
    tile: { title: "Marketplace", description: "Discover local businesses, services, and deals near you." },
  },
  {
    id: "near-by",
    packageName: "@metrohub/near-by",
    folder: "app-near-by",
    displayName: "Near By",
    category: "Site Seeing",
    route: "/apps/near-by",
    icon: "📍",
    tile: { title: "Near By", description: "Discover nearby places to visit." },
  },
  {
    id: "raffle",
    packageName: "@metrohub/raffle",
    folder: "app-raffle",
    displayName: "Raffle",
    category: "Scoreboards",
    route: "/apps/raffle",
    icon: "🎟️",
    tile: { title: "Raffle", description: "Run a raffle — add entrants and draw a random winner." },
  },
  {
    id: "events",
    packageName: "@metrohub/events",
    folder: "app-events",
    displayName: "Event Planner",
    category: "Events",
    route: "/apps/events",
    icon: "🎉",
    tile: { title: "Event Planner", description: "Create an event, share the link, and collect RSVPs — no login for guests." },
  },
];
