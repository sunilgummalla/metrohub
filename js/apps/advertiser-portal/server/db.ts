import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertBooking,
  InsertUser,
  adSlots,
  aiChatMessages,
  bookings,
  campaignClicks,
  campaignImpressions,
  presenceHourly,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ──────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const v = user[field];
    if (v !== undefined) {
      values[field] = v ?? null;
      updateSet[field] = v ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function updateUserProfile(
  userId: number,
  data: { businessName?: string; businessCategory?: string; phone?: string; name?: string }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function upgradeMemberTier(userId: number, tier: "basic" | "pro") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ memberTier: tier }).where(eq(users.id, userId));
}

// ─── Ad Slots ────────────────────────────────────────────────────────────────

export async function getAllAdSlots() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adSlots).where(eq(adSlots.isActive, "yes"));
}

export async function seedAdSlots() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(adSlots).limit(1);
  if (existing.length > 0) return; // already seeded

  const slots = [
    {
      slotId: "hero-banner",
      name: "Hero Banner",
      description: "Full-width banner at the top of the MetroHub shell, visible on every page.",
      placement: "Shell top, above app tile grid",
      format: "Full-width image + CTA (1200×300)",
      appName: "shell",
      basePricePerDay: "49.99",
      requiresPro: "yes" as const,
    },
    {
      slotId: "news-ticker",
      name: "News Ticker Sponsorship",
      description: "Sponsored message in the scrolling news ticker strip below the header.",
      placement: "Shell, below header, above app grid",
      format: "Text + icon (max 80 chars)",
      appName: "shell",
      basePricePerDay: "19.99",
      requiresPro: "no" as const,
    },
    {
      slotId: "poker-scorecard-footer",
      name: "Poker Scorecard Footer",
      description: "Slim banner at the bottom of the Poker Scorecard app.",
      placement: "Poker app, bottom bar",
      format: "Icon + one-liner (320×50)",
      appName: "poker",
      basePricePerDay: "14.99",
      requiresPro: "no" as const,
    },
    {
      slotId: "rummy-scorecard-footer",
      name: "Rummy Scorecard Footer",
      description: "Slim banner at the bottom of the Rummy Scorecard app.",
      placement: "Rummy app, bottom bar",
      format: "Icon + one-liner (320×50)",
      appName: "rummy",
      basePricePerDay: "14.99",
      requiresPro: "no" as const,
    },
    {
      slotId: "tambola-sidebar",
      name: "Tambola Sidebar",
      description: "Small banner beside the Tambola number board.",
      placement: "Tambola app, beside number board",
      format: "Small banner (320×50)",
      appName: "tambola",
      basePricePerDay: "12.99",
      requiresPro: "no" as const,
    },
    {
      slotId: "bingo-sidebar",
      name: "Bingo Sidebar",
      description: "Small banner beside the Bingo number board.",
      placement: "Bingo app, beside number board",
      format: "Small banner (320×50)",
      appName: "bingo",
      basePricePerDay: "12.99",
      requiresPro: "no" as const,
    },
  ];

  await db.insert(adSlots).values(slots);
}

// ─── Presence ────────────────────────────────────────────────────────────────

// Simulated live counts (in production these come from the heartbeat engine)
const MOCK_LIVE_COUNTS: Record<string, number> = {
  poker: 145,
  rummy: 89,
  tambola: 212,
  bingo: 67,
  shell: 340,
};

export async function getLivePresence() {
  // In production: query Redis or the last 5-min window of presence_events
  return Object.entries(MOCK_LIVE_COUNTS).map(([appName, count]) => ({
    appName,
    count,
    updatedAt: new Date(),
  }));
}

export async function getHistoricalPresence(
  appName: string,
  from: Date,
  to: Date
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(presenceHourly)
    .where(
      and(
        eq(presenceHourly.appName, appName),
        gte(presenceHourly.hourStart, from),
        lte(presenceHourly.hourStart, to)
      )
    )
    .orderBy(presenceHourly.hourStart);
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export async function createBooking(data: InsertBooking) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(bookings).values(data);
  return result[0];
}

export async function getBookingsByAdvertiser(advertiserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(bookings)
    .where(eq(bookings.advertiserId, advertiserId))
    .orderBy(desc(bookings.createdAt));
}

export async function updateBookingStatus(
  bookingId: number,
  status: "pending_payment" | "pending_moderation" | "approved" | "active" | "completed" | "rejected" | "cancelled",
  extra?: { paymentIntentId?: string; paidAt?: Date; moderationNote?: string }
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(bookings)
    .set({ status, ...extra })
    .where(eq(bookings.id, bookingId));
}

// ─── Campaign Stats ──────────────────────────────────────────────────────────

export async function getCampaignStats(advertiserId: number) {
  const db = await getDb();
  if (!db) return { impressions: 0, clicks: 0, ctr: 0 };

  const [impRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(campaignImpressions)
    .where(eq(campaignImpressions.advertiserId, advertiserId));

  const [clkRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(campaignClicks)
    .where(eq(campaignClicks.advertiserId, advertiserId));

  const impressions = Number(impRow?.total ?? 0);
  const clicks = Number(clkRow?.total ?? 0);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  return { impressions, clicks, ctr: Math.round(ctr * 100) / 100 };
}

export async function getCampaignsByAdvertiser(advertiserId: number) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.advertiserId, advertiserId),
        sql`${bookings.status} IN ('approved','active','completed')`
      )
    )
    .orderBy(desc(bookings.createdAt));

  // Attach impression/click counts per booking
  const enriched = await Promise.all(
    rows.map(async (b) => {
      const [imp] = await db!
        .select({ total: sql<number>`count(*)` })
        .from(campaignImpressions)
        .where(eq(campaignImpressions.bookingId, b.id));
      const [clk] = await db!
        .select({ total: sql<number>`count(*)` })
        .from(campaignClicks)
        .where(eq(campaignClicks.bookingId, b.id));
      const impressions = Number(imp?.total ?? 0);
      const clicks = Number(clk?.total ?? 0);
      return {
        ...b,
        impressions,
        clicks,
        ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
      };
    })
  );
  return enriched;
}

// ─── AI Chat ─────────────────────────────────────────────────────────────────

export async function getAiChatHistory(advertiserId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(aiChatMessages)
    .where(eq(aiChatMessages.advertiserId, advertiserId))
    .orderBy(aiChatMessages.createdAt)
    .limit(limit);
}

export async function saveAiChatMessage(
  advertiserId: number,
  role: "user" | "assistant",
  content: string
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(aiChatMessages).values({ advertiserId, role, content });
}
