// Response shapes from the /api/home/* endpoints.

export interface VendorCard {
  id: string;
  name: string;
  category: string;
  address: string;
  featured: boolean;
  image: string | null;
  rating: number | null;
  ratingCount: number | null;
  priceLevel: number | null;
  open: boolean | null;
  hoursLabel: string | null;
  distanceMi: number | null;
}

export interface DealCard {
  id: string;
  title: string;
  blurb: string;
  kind: string;
  vendor?: VendorCard | null;
}

export interface Plan {
  planId: string;
  name: string;
  intervalDays: number;
  prices: { INR: number; USD: number; CAD: number };
  features: string[];
}

export interface Landing {
  citySlug: string;
  stats: { neighbors: number; vendors: number; gamesLiveTonight: number };
  featuredDeal: DealCard | null;
  featuredVendors: VendorCard[];
  vendors: VendorCard[];
  deals: DealCard[];
  plans: Plan[];
}

export interface GameSummary {
  gameId: string;
  joinCode: string;
  gameType: string;
  targetScore: number;
  round: number;
  leader: string | null;
  standings: Array<{ name: string; total: number; toBust: number }>;
}

export interface Dashboard {
  user: { displayName: string; email: string; handle: string };
  membership: { planId: string; name: string; status: string } | null;
  accounts: {
    currency: string;
    totalBalanceMinor: number;
    items: Array<{ name: string; kind: string; balanceMinor: number; currency: string }>;
  };
  splits: {
    currency: string;
    netMinor: number;
    openCount: number;
    items: Array<{ counterparty: string; context: string; amountMinor: number; currency: string }>;
  };
  activeGame: GameSummary | null;
  deals: Array<{ id: string; title: string; blurb: string; kind: string }>;
  nearby: VendorCard[];
  plans: Plan[];
}
