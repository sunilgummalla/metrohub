import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Account,
  AccountDocument,
  App,
  AppDocument,
  Deal,
  DealDocument,
  Event,
  EventDocument,
  EventRsvp,
  EventRsvpDocument,
  GameParticipant,
  GameParticipantDocument,
  GameSession,
  GameSessionDocument,
  Split,
  SplitDocument,
  Subscription,
  SubscriptionDocument,
  User,
  UserDocument,
  Vendor,
  VendorDocument,
} from "../database";
import { APP_CATALOG } from "./app-catalog";

/**
 * Seeds MongoDB on boot, idempotently (upsert by natural keys):
 *   - The app catalog (the shell's routing registry) is seeded UNCONDITIONALLY,
 *     since GET /api/home/apps must work in every environment.
 *   - The demo/sample content (vendors, deals, accounts, the demo persona) is
 *     seeded ONLY when SEED_SAMPLE_DATA === "true".
 * So the storefront/console home render real data with no static/stubbed content
 * in the shell.
 */

const CITY = "seattle";
const DEMO_EMAIL = "sunil@mayuriseattle.com";
const DEMO_GAME_ID = "a1b2c3d4-0000-4000-8000-000000000001"; // fixed UUID v4
const FAR_FUTURE = new Date("2099-01-01T00:00:00.000Z");

/** Seattle-ish coordinates as [lng, lat] (GeoJSON order). */
const VENDORS: Array<{
  businessName: string;
  category: string;
  featured: boolean;
  address: string;
  description: string;
  images: string[];
  lng: number;
  lat: number;
  rating: number;
  ratingCount: number;
  priceLevel: number;
  hoursLabel: string;
  open: boolean;
  searchTags: string[];
  contact: { phone: string | null; email: string | null; website: string | null };
}> = [
  {
    businessName: "Mayuri Foods",
    category: "Grocer",
    featured: true,
    address: "2245 148th Ave NE, Redmond",
    description: "Neighborhood Indian grocer & kitchen — fresh produce, spices, and a weekend thali counter.",
    images: [],
    lng: -122.14, lat: 47.63, rating: 4.6, ratingCount: 214, priceLevel: 2,
    hoursLabel: "Open till 9", open: true, searchTags: ["indian", "grocery", "thali", "spices"],
    contact: { phone: "+1 425-555-0142", email: "hello@mayurifoods.example", website: null },
  },
  {
    businessName: "Spice Route Café",
    category: "Café",
    featured: false,
    address: "410 Bellevue Way NE, Bellevue",
    description: "Chai, filter coffee and South-Indian snacks. Cozy corner for game-night pre-parties.",
    images: [],
    lng: -122.20, lat: 47.61, rating: 4.9, ratingCount: 98, priceLevel: 1,
    hoursLabel: "Open now", open: true, searchTags: ["chai", "coffee", "café"],
    contact: { phone: "+1 425-555-0177", email: null, website: null },
  },
  {
    businessName: "ATA Community Hall",
    category: "Events",
    featured: true,
    address: "1200 Community Way, Bellevue",
    description: "Local community venue hosting Tambola nights, cultural events and private bookings.",
    images: [],
    lng: -122.19, lat: 47.60, rating: 4.5, ratingCount: 61, priceLevel: 2,
    hoursLabel: "RSVP for Sat", open: true, searchTags: ["events", "venue", "tambola", "community"],
    contact: { phone: "+1 425-555-0199", email: "events@atahall.example", website: null },
  },
  {
    businessName: "Rani Florals",
    category: "Florist",
    featured: false,
    address: "88 Main St, Kirkland",
    description: "Fresh flowers, garlands and event décor for weddings and festivals.",
    images: [],
    lng: -122.21, lat: 47.68, rating: 4.4, ratingCount: 47, priceLevel: 2,
    hoursLabel: "Open till 7", open: true, searchTags: ["flowers", "florist", "decor"],
    contact: { phone: "+1 425-555-0121", email: null, website: null },
  },
  {
    businessName: "Dosa Corner",
    category: "Restaurant",
    featured: false,
    address: "15230 NE 24th St, Redmond",
    description: "Crispy dosas, idli and filter coffee. Family-run since 2011.",
    images: [],
    lng: -122.13, lat: 47.62, rating: 4.7, ratingCount: 320, priceLevel: 2,
    hoursLabel: "Open till 10", open: true, searchTags: ["dosa", "south indian", "restaurant"],
    contact: { phone: "+1 425-555-0164", email: null, website: null },
  },
  {
    businessName: "Namaste Grocery",
    category: "Grocer",
    featured: false,
    address: "3600 Factoria Blvd SE, Bellevue",
    description: "Pantry staples, lentils, frozen snacks and fresh vegetables.",
    images: [],
    lng: -122.16, lat: 47.58, rating: 4.3, ratingCount: 156, priceLevel: 1,
    hoursLabel: "Closed · opens 9am", open: false, searchTags: ["grocery", "indian", "pantry"],
    contact: { phone: "+1 425-555-0188", email: null, website: null },
  },
];

/** Deals keyed by vendor business name (resolved to vendorId at seed time). */
const DEALS: Array<{ vendor: string; title: string; blurb: string; kind: string }> = [
  { vendor: "Mayuri Foods", title: "Weekend thali box — 15% off", blurb: "Order ahead, skip the line, pick up by 9pm.", kind: "featured" },
  { vendor: "Spice Route Café", title: "Buy 2 get 1 chai free", blurb: "All week, dine-in only.", kind: "new" },
  { vendor: "ATA Community Hall", title: "Tambola night · Saturday 7pm", blurb: "Family game night — tickets at the door.", kind: "event" },
  { vendor: "Dosa Corner", title: "Free filter coffee with any dosa", blurb: "Weekdays before 11am.", kind: "deal" },
];

const ACCOUNTS: Array<{ name: string; kind: string; balanceMinor: number }> = [
  { name: "Everyday Checking", kind: "checking", balanceMinor: 214800 },
  { name: "Rainy Day Savings", kind: "savings", balanceMinor: 118200 },
  { name: "Game Night Cash", kind: "cash", balanceMinor: 15022 },
]; // total = $3,480.22

const SPLITS: Array<{ counterparty: string; context: string; amountMinor: number }> = [
  { counterparty: "Sagar", context: "Rummy · Friday table", amountMinor: 2500 },
  { counterparty: "Naga", context: "Takeout · Dosa Corner", amountMinor: 1700 },
]; // net owed to you = +$42.00, 2 open

/** Live rummy game payload — matches the RummyScorecard state shape. */
function rummyPayload() {
  const mk = (event: string, score: number) => ({ event, score, rawInput: score });
  return {
    phase: "playing",
    targetScore: 250,
    rules: { drop: 25, middleDrop: 40, fullCount: 80, winnerBonus: 0 },
    players: [
      { id: "p1", name: "Sunil", status: "active" },
      { id: "p2", name: "Sagar", status: "active" },
      { id: "p3", name: "Naga", status: "active" },
      { id: "p4", name: "Soma", status: "active" },
    ],
    rounds: [
      { id: "r1", cancelled: false, entries: { p1: mk("drop", 25), p2: mk("winner", 0), p3: mk("none", 22), p4: mk("drop", 25) } },
      { id: "r2", cancelled: false, entries: { p1: mk("winner", 0), p2: mk("none", 25), p3: mk("none", 77), p4: mk("none", 10) } },
      { id: "r3", cancelled: false, entries: { p1: mk("none", 12), p2: mk("winner", 0), p3: mk("none", 25), p4: mk("none", 31) } },
    ],
  };
}

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Vendor.name) private readonly vendorModel: Model<VendorDocument>,
    @InjectModel(Deal.name) private readonly dealModel: Model<DealDocument>,
    @InjectModel(Account.name) private readonly accountModel: Model<AccountDocument>,
    @InjectModel(Split.name) private readonly splitModel: Model<SplitDocument>,
    @InjectModel(Subscription.name) private readonly subModel: Model<SubscriptionDocument>,
    @InjectModel(GameSession.name) private readonly gameModel: Model<GameSessionDocument>,
    @InjectModel(GameParticipant.name) private readonly participantModel: Model<GameParticipantDocument>,
    @InjectModel(App.name) private readonly appModel: Model<AppDocument>,
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @InjectModel(EventRsvp.name) private readonly rsvpModel: Model<EventRsvpDocument>,
  ) {}

  async onModuleInit() {
    // The app catalog is the shell's routing registry (GET /api/home/apps) — it
    // must exist in every environment, not just demo ones, or the shell can't
    // route to any app. Seed it unconditionally (idempotent upsert by appId).
    try {
      await this.seedApps();
      this.logger.log("App catalog seeded");
    } catch (err) {
      // Never let seeding crash the API.
      this.logger.error(`App catalog seed failed: ${(err as Error).message}`);
    }

    // Demo/sample content (vendors, deals, accounts, the demo persona) is opt-in.
    if (process.env.SEED_SAMPLE_DATA !== "true") return;
    try {
      await this.seedSampleData();
      this.logger.log("Sample data seeded (SEED_SAMPLE_DATA=true)");
    } catch (err) {
      this.logger.error(`Sample data seed failed: ${(err as Error).message}`);
    }
  }

  /** App catalog (the shell's micro-app registry, keyed by appId). */
  private async seedApps() {
    for (let i = 0; i < APP_CATALOG.length; i++) {
      const a = APP_CATALOG[i];
      await this.appModel.updateOne(
        { appId: a.id },
        {
          $set: {
            packageName: a.packageName,
            folder: a.folder,
            displayName: a.displayName,
            category: a.category,
            route: a.route,
            icon: a.icon,
            tileTitle: a.tile.title,
            tileDescription: a.tile.description,
            order: i,
            active: true,
          },
        },
        { upsert: true },
      );
    }
    // Deactivate any catalog entries that were removed from APP_CATALOG so stale
    // apps don't linger as active in Mongo (and in GET /api/home/apps).
    await this.appModel.updateMany(
      { appId: { $nin: APP_CATALOG.map((a) => a.id) } },
      { $set: { active: false } },
    );
  }

  private async seedSampleData() {
    // 1. Demo user (owner of the console dashboard)
    await this.userModel.updateOne(
      { email: DEMO_EMAIL },
      {
        $setOnInsert: { email: DEMO_EMAIL, passwordHash: null, oauthProviders: [] },
        $set: { displayName: "Sunil Gummalla", defaultHandle: "sunil" },
      },
      { upsert: true },
    );
    const user = await this.userModel.findOne({ email: DEMO_EMAIL }).lean();
    if (!user) throw new Error("demo user not found after upsert");
    const userId = user._id as Types.ObjectId;

    // 2. Vendors (approved, in-city) + collect their ids for deals
    const vendorIdByName = new Map<string, Types.ObjectId>();
    for (const v of VENDORS) {
      await this.vendorModel.updateOne(
        // Scope the match to the demo owner so re-seeding can't overwrite a real
        // vendor that happens to share { citySlug, businessName }.
        { citySlug: CITY, businessName: v.businessName, ownerId: userId },
        {
          $set: {
            status: "approved",
            category: v.category,
            featured: v.featured,
            descriptionMarkdown: v.description,
            images: v.images,
            searchTags: v.searchTags,
            address: v.address,
            contact: v.contact,
            location: { type: "Point", coordinates: [v.lng, v.lat] },
            categoryData: {
              rating: v.rating,
              ratingCount: v.ratingCount,
              priceLevel: v.priceLevel,
              hoursLabel: v.hoursLabel,
              open: v.open,
            },
          },
        },
        { upsert: true },
      );
      const doc = await this.vendorModel.findOne({ citySlug: CITY, businessName: v.businessName, ownerId: userId }, { _id: 1 }).lean();
      if (doc) vendorIdByName.set(v.businessName, doc._id as Types.ObjectId);
    }

    // 3. Deals (linked to vendors)
    for (const d of DEALS) {
      const vendorId = vendorIdByName.get(d.vendor);
      if (!vendorId) continue;
      await this.dealModel.updateOne(
        { vendorId, title: d.title },
        { $set: { citySlug: CITY, blurb: d.blurb, kind: d.kind, active: true, expiresAt: null } },
        { upsert: true },
      );
    }

    // 4. Pro subscription for the demo user
    await this.subModel.updateOne(
      { userId },
      {
        $set: {
          planId: "pro_monthly",
          status: "active",
          currentPeriodEnd: FAR_FUTURE,
          paymentProvider: null,
        },
      },
      { upsert: true },
    );

    // 5. Accounts
    for (const a of ACCOUNTS) {
      await this.accountModel.updateOne(
        { userId, name: a.name },
        { $set: { kind: a.kind, balanceMinor: a.balanceMinor, currency: "USD" } },
        { upsert: true },
      );
    }

    // 6. Splits (open)
    for (const s of SPLITS) {
      await this.splitModel.updateOne(
        { userId, counterparty: s.counterparty, context: s.context },
        { $set: { amountMinor: s.amountMinor, currency: "USD", status: "open" } },
        { upsert: true },
      );
    }

    // 7. Live rummy game session + host participant (far-future expiry so it persists)
    await this.gameModel.updateOne(
      { gameId: DEMO_GAME_ID },
      {
        $set: {
          // Lowercase adjective-noun-NN, matching generateJoinCode() — joinByCode
          // looks up joinCode.toLowerCase(), so an uppercase code is unjoinable.
          joinCode: "friday-rummy-01",
          gameType: "rummy",
          payload: rummyPayload(),
          status: "active",
          expiresAt: FAR_FUTURE,
        },
      },
      { upsert: true },
    );
    await this.participantModel.updateOne(
      { userId, gameId: DEMO_GAME_ID },
      { $set: { handle: "Sunil", role: "host", isGuest: false, joinedAt: new Date() } },
      { upsert: true },
    );

    // 9. Demo personal event (hosted by the demo user) + a few RSVPs. startAt is
    // kept ~18 days out on each boot so the demo event is always upcoming.
    const DEMO_EVENT_ID = "block-potluck-demo";
    await this.eventModel.updateOne(
      { eventId: DEMO_EVENT_ID },
      {
        $set: {
          hostId: userId,
          title: "Crossroads Block Potluck",
          description: "Bring a dish to share — games on the lawn, chai, and a raffle. Kids welcome!",
          emoji: "🥘",
          startAt: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
          location: "Crossroads Park, Bellevue",
          kind: "personal",
        },
      },
      { upsert: true },
    );
    const rsvps: Array<{ name: string; status: string; guests: number; note: string }> = [
      { name: "Sagar", status: "going", guests: 2, note: "Bringing biryani 🍚" },
      { name: "Naga", status: "going", guests: 1, note: "" },
      { name: "Soma", status: "maybe", guests: 0, note: "Will try to make it after work" },
      { name: "Priya", status: "going", guests: 3, note: "Kids + dessert!" },
    ];
    for (const r of rsvps) {
      await this.rsvpModel.updateOne(
        { eventId: DEMO_EVENT_ID, nameKey: r.name.toLowerCase() },
        { $set: { name: r.name, status: r.status, guests: r.guests, note: r.note } },
        { upsert: true },
      );
    }
  }
}
