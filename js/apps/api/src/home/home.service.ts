import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Account,
  AccountDocument,
  App,
  AppDocument,
  Deal,
  DealDocument,
  GameParticipant,
  GameParticipantDocument,
  GameSession,
  GameSessionDocument,
  Split,
  SplitDocument,
  Subscription,
  SubscriptionDocument,
  SubscriptionPlan,
  SubscriptionPlanDocument,
  User,
  UserDocument,
  Vendor,
  VendorDocument,
} from "../database";

/** Neighborhood centre used to label vendor distance (Crossroads, Bellevue). */
const CITY_CENTER = { lng: -122.15, lat: 47.62 };
const DEMO_EMAIL = "sunil@mayuriseattle.com";

function haversineMi(a: { lng: number; lat: number }, b: { lng: number; lat: number }): number {
  const R = 3958.8; // miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)) * 10) / 10;
}

interface VendorLean {
  _id: Types.ObjectId;
  businessName: string;
  category: string;
  address: string;
  featured: boolean;
  images: string[];
  location?: { coordinates: [number, number] } | null;
  categoryData?: Record<string, unknown>;
}

function toVendorCard(v: VendorLean) {
  const cd = (v.categoryData ?? {}) as Record<string, unknown>;
  const coords = v.location?.coordinates;
  const distanceMi =
    coords ? haversineMi(CITY_CENTER, { lng: coords[0], lat: coords[1] }) : null;
  return {
    id: String(v._id),
    name: v.businessName,
    category: v.category,
    address: v.address,
    featured: !!v.featured,
    image: v.images?.[0] ?? null,
    rating: typeof cd.rating === "number" ? cd.rating : null,
    ratingCount: typeof cd.ratingCount === "number" ? cd.ratingCount : null,
    priceLevel: typeof cd.priceLevel === "number" ? cd.priceLevel : null,
    open: typeof cd.open === "boolean" ? cd.open : null,
    hoursLabel: typeof cd.hoursLabel === "string" ? cd.hoursLabel : null,
    distanceMi,
  };
}

@Injectable()
export class HomeService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Vendor.name) private readonly vendorModel: Model<VendorDocument>,
    @InjectModel(Deal.name) private readonly dealModel: Model<DealDocument>,
    @InjectModel(Account.name) private readonly accountModel: Model<AccountDocument>,
    @InjectModel(Split.name) private readonly splitModel: Model<SplitDocument>,
    @InjectModel(Subscription.name) private readonly subModel: Model<SubscriptionDocument>,
    @InjectModel(SubscriptionPlan.name) private readonly planModel: Model<SubscriptionPlanDocument>,
    @InjectModel(GameSession.name) private readonly gameModel: Model<GameSessionDocument>,
    @InjectModel(GameParticipant.name) private readonly participantModel: Model<GameParticipantDocument>,
    @InjectModel(App.name) private readonly appModel: Model<AppDocument>,
  ) {}

  /**
   * The shell's micro-app catalog (the registry that used to live in
   * app-registry.json). Public — the shell reads it at boot to route and to
   * render the launcher.
   */
  async getApps() {
    const apps = await this.appModel.find({ active: true }).sort({ order: 1 }).lean();
    return {
      apps: apps.map((a) => ({
        id: a.appId,
        packageName: a.packageName,
        folder: a.folder,
        displayName: a.displayName,
        category: a.category,
        route: a.route,
        icon: a.icon,
        tile: { title: a.tileTitle, description: a.tileDescription },
      })),
    };
  }

  /**
   * Token = the demo user's id so the shell can sign in without real OAuth.
   *
   * Gated on SEED_SAMPLE_DATA so this token-minting endpoint only exists where
   * the demo persona is actually seeded (the demo/showcase deployments). In any
   * environment without sample data it is disabled — no unauthenticated token
   * issuance. This is a stub pending real OAuth.
   */
  async demoLoginToken(): Promise<{ token: string; displayName: string; email: string }> {
    if (process.env.SEED_SAMPLE_DATA !== "true") {
      throw new ForbiddenException("Demo login is disabled in this environment.");
    }
    const user = await this.userModel.findOne({ email: DEMO_EMAIL }).lean();
    if (!user) throw new NotFoundException("Demo user is not seeded (SEED_SAMPLE_DATA must be on).");
    return {
      token: `stub-token-${(user._id as Types.ObjectId).toHexString()}`,
      displayName: user.displayName,
      email: user.email,
    };
  }

  async getLanding(citySlugRaw?: string) {
    const citySlug = (citySlugRaw ?? "seattle").trim().toLowerCase() || "seattle";
    const [featured, vendors, plans, deals, vendorCount, gamesLive, neighbors] = await Promise.all([
      this.vendorModel.find({ citySlug, status: "approved", featured: true }).limit(4).lean(),
      this.vendorModel.find({ citySlug, status: "approved" }).limit(8).lean(),
      this.planModel.find({ isActive: true }).sort({ intervalDays: 1 }).lean(),
      this.dealModel.find({ citySlug, active: true }).limit(6).lean(),
      this.vendorModel.countDocuments({ citySlug, status: "approved" }),
      this.gameModel.countDocuments({ status: "active" }),
      this.userModel.estimatedDocumentCount(),
    ]);

    const vById = new Map(vendors.concat(featured).map((v) => [String(v._id), v as unknown as VendorLean]));

    // Deals may reference vendors outside the limited lists above — fetch any
    // missing ones so every deal card resolves its vendor.
    const missingVendorIds = [...new Set(deals.map((d) => String(d.vendorId)).filter((id) => !vById.has(id)))];
    if (missingVendorIds.length) {
      const extra = await this.vendorModel.find({ _id: { $in: missingVendorIds } }).lean();
      for (const v of extra) vById.set(String(v._id), v as unknown as VendorLean);
    }

    const featuredDeal = deals.find((d) => d.kind === "featured") ?? deals[0] ?? null;

    return {
      citySlug,
      stats: { neighbors, vendors: vendorCount, gamesLiveTonight: gamesLive },
      featuredDeal: featuredDeal
        ? { ...this.toDealCard(featuredDeal, vById.get(String(featuredDeal.vendorId))) }
        : null,
      featuredVendors: (featured as unknown as VendorLean[]).map(toVendorCard),
      vendors: (vendors as unknown as VendorLean[]).map(toVendorCard),
      deals: deals.map((d) => this.toDealCard(d, vById.get(String(d.vendorId)))),
      plans,
    };
  }

  private toDealCard(d: DealDocument, vendor?: VendorLean) {
    return {
      id: String(d._id),
      title: d.title,
      blurb: d.blurb,
      kind: d.kind,
      vendor: vendor ? toVendorCard(vendor) : null,
    };
  }

  async getDashboard(userId: string) {
    let oid: Types.ObjectId;
    try {
      oid = new Types.ObjectId(userId);
    } catch {
      throw new NotFoundException("Unknown user");
    }
    const user = await this.userModel.findById(oid).lean();
    if (!user) throw new NotFoundException("Unknown user");

    const [sub, accounts, splits, participant, plans] = await Promise.all([
      this.subModel.findOne({ userId: oid }).lean(),
      this.accountModel.find({ userId: oid }).sort({ createdAt: 1 }).lean(),
      this.splitModel.find({ userId: oid, status: "open" }).sort({ createdAt: 1 }).lean(),
      this.participantModel.findOne({ userId: oid, role: "host" }).lean(),
      this.planModel.find({ isActive: true }).sort({ intervalDays: 1 }).lean(),
    ]);

    // Membership
    let membership: { planId: string; name: string; status: string } | null = null;
    if (sub) {
      const plan = plans.find((p) => p.planId === sub.planId);
      membership = { planId: sub.planId, name: plan?.name ?? sub.planId, status: sub.status };
    }

    // Accounts summary
    const currency = accounts[0]?.currency ?? "USD";
    const totalBalanceMinor = accounts.reduce((s, a) => s + a.balanceMinor, 0);

    // Splits summary (signed: + owed to you). Currency comes from the split
    // records themselves, not the accounts — they may differ.
    const splitsCurrency = splits[0]?.currency ?? "USD";
    const netMinor = splits.reduce((s, x) => s + x.amountMinor, 0);

    // Active game (join participant -> active session, compute standings from payload)
    let activeGame: unknown = null;
    if (participant) {
      const session = await this.gameModel
        .findOne({ gameId: participant.gameId, status: "active" })
        .lean();
      if (session) activeGame = this.summarizeGame(session);
    }

    // Nearby deals + vendors for the "near you" tiles (city from the user's vendor if any)
    const citySlug = "seattle";
    const [deals, nearbyVendors] = await Promise.all([
      this.dealModel.find({ citySlug, active: true }).limit(5).lean(),
      this.vendorModel.find({ citySlug, status: "approved" }).limit(6).lean(),
    ]);

    return {
      user: { displayName: user.displayName, email: user.email, handle: user.defaultHandle },
      membership,
      accounts: {
        currency,
        totalBalanceMinor,
        items: accounts.map((a) => ({ name: a.name, kind: a.kind, balanceMinor: a.balanceMinor, currency: a.currency })),
      },
      splits: {
        currency: splitsCurrency,
        netMinor,
        openCount: splits.length,
        items: splits.map((s) => ({ counterparty: s.counterparty, context: s.context, amountMinor: s.amountMinor, currency: s.currency })),
      },
      activeGame,
      deals: deals.map((d) => ({ id: String(d._id), title: d.title, blurb: d.blurb, kind: d.kind })),
      nearby: (nearbyVendors as unknown as VendorLean[]).map(toVendorCard),
      plans,
    };
  }

  /** Compute a leaderboard from a rummy game payload (lowest total wins). */
  private summarizeGame(session: { gameId: string; joinCode: string; gameType: string; payload: Record<string, unknown> }) {
    const p = session.payload as {
      players?: Array<{ id: string; name: string }>;
      rounds?: Array<{ cancelled?: boolean; entries?: Record<string, { score?: number }> }>;
      targetScore?: number;
    };
    const players = p.players ?? [];
    const rounds = (p.rounds ?? []).filter((r) => !r.cancelled);
    const target = typeof p.targetScore === "number" ? p.targetScore : 0;
    const standings = players
      .map((pl) => {
        const total = rounds.reduce((sum, r) => sum + (r.entries?.[pl.id]?.score ?? 0), 0);
        return { name: pl.name, total, toBust: Math.max(0, target - total) };
      })
      .sort((a, b) => a.total - b.total);
    const leader = standings[0]?.name ?? null;
    return {
      gameId: session.gameId,
      joinCode: session.joinCode,
      gameType: session.gameType,
      targetScore: target,
      round: rounds.length,
      leader,
      standings,
    };
  }
}
