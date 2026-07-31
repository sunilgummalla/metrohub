import {
  bigint,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users (extended with advertiser fields) ────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  memberTier: mysqlEnum("memberTier", ["basic", "pro"]).default("basic").notNull(),
  businessName: varchar("businessName", { length: 255 }),
  businessCategory: varchar("businessCategory", { length: 128 }),
  phone: varchar("phone", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Ad Slots (6 canonical selling units) ──────────────────────────────────
export const adSlots = mysqlTable("ad_slots", {
  id: int("id").autoincrement().primaryKey(),
  slotId: varchar("slotId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  placement: varchar("placement", { length: 255 }),
  format: varchar("format", { length: 64 }),
  appName: varchar("appName", { length: 64 }),
  basePricePerDay: decimal("basePricePerDay", { precision: 10, scale: 2 }).notNull(),
  isActive: mysqlEnum("isActive", ["yes", "no"]).default("yes").notNull(),
  requiresPro: mysqlEnum("requiresPro", ["yes", "no"]).default("no").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdSlot = typeof adSlots.$inferSelect;

// ─── Presence Events (raw, 7-day TTL) ──────────────────────────────────────
export const presenceEvents = mysqlTable("presence_events", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  appRoute: varchar("appRoute", { length: 128 }).notNull(),
  appName: varchar("appName", { length: 64 }).notNull(),
  userCount: int("userCount").notNull().default(1),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

// ─── Presence Hourly (aggregated, 3-year retention) ────────────────────────
export const presenceHourly = mysqlTable("presence_hourly", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  appName: varchar("appName", { length: 64 }).notNull(),
  hourStart: timestamp("hourStart").notNull(),
  peakCount: int("peakCount").notNull().default(0),
  avgCount: decimal("avgCount", { precision: 8, scale: 2 }).notNull().default("0"),
  totalSessions: int("totalSessions").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PresenceHourly = typeof presenceHourly.$inferSelect;

// ─── Bookings ───────────────────────────────────────────────────────────────
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  advertiserId: int("advertiserId").notNull(),
  slotId: varchar("slotId", { length: 64 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", [
    "pending_payment",
    "pending_moderation",
    "approved",
    "active",
    "completed",
    "rejected",
    "cancelled",
  ]).default("pending_payment").notNull(),
  paymentProvider: varchar("paymentProvider", { length: 32 }),
  paymentSessionId: varchar("paymentSessionId", { length: 255 }),
  paymentIntentId: varchar("paymentIntentId", { length: 255 }),
  paidAt: timestamp("paidAt"),
  creativeImageUrl: text("creativeImageUrl"),
  creativeCopy: text("creativeCopy"),
  creativeClickUrl: varchar("creativeClickUrl", { length: 512 }),
  moderationNote: text("moderationNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

// ─── Campaign Impressions ───────────────────────────────────────────────────
export const campaignImpressions = mysqlTable("campaign_impressions", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  advertiserId: int("advertiserId").notNull(),
  slotId: varchar("slotId", { length: 64 }).notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

// ─── Campaign Clicks ────────────────────────────────────────────────────────
export const campaignClicks = mysqlTable("campaign_clicks", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  advertiserId: int("advertiserId").notNull(),
  slotId: varchar("slotId", { length: 64 }).notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

// ─── AI Chat History ────────────────────────────────────────────────────────
export const aiChatMessages = mysqlTable("ai_chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  advertiserId: int("advertiserId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiChatMessage = typeof aiChatMessages.$inferSelect;
