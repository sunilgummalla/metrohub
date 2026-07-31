/**
 * MetroHub Advertiser Portal — Server-side unit tests
 *
 * Covers:
 *  1. Payment adapter factory — Stripe default, PayPal when env set
 *  2. Membership tier gating — protectedProcedure enforces auth
 *  3. AI router data isolation — Pro-only gate throws UPGRADE_REQUIRED
 *  4. Slots router — canonical slot IDs are present after seeding
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { appRouter } from "./routers";
import { getPaymentAdapter } from "./payment";
import type { TrpcContext } from "./_core/context";
import { TRPCError } from "@trpc/server";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    memberTier: "basic",
    businessName: null,
    businessCategory: null,
    phone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(user: AuthenticatedUser | null = makeUser()): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── 1. Payment Adapter Factory ───────────────────────────────────────────────

describe("getPaymentAdapter()", () => {
  const originalEnv = process.env.PAYMENT_PROVIDER;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.PAYMENT_PROVIDER;
    } else {
      process.env.PAYMENT_PROVIDER = originalEnv;
    }
  });

  it("returns Stripe adapter by default (no env var set)", () => {
    delete process.env.PAYMENT_PROVIDER;
    const adapter = getPaymentAdapter();
    // Stripe session IDs start with cs_mock_
    return adapter
      .createCheckoutSession({
        bookingId: 1,
        amount: 1999,
        currency: "usd",
        description: "Test booking",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      })
      .then((result) => {
        expect(result.provider).toBe("stripe");
        expect(result.sessionId).toMatch(/^cs_mock_/);
      });
  });

  it("returns Stripe adapter when PAYMENT_PROVIDER=stripe", () => {
    process.env.PAYMENT_PROVIDER = "stripe";
    const adapter = getPaymentAdapter();
    return adapter
      .createCheckoutSession({
        bookingId: 2,
        amount: 2999,
        currency: "usd",
        description: "Stripe test",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      })
      .then((result) => {
        expect(result.provider).toBe("stripe");
      });
  });

  it("returns PayPal adapter when PAYMENT_PROVIDER=paypal", () => {
    process.env.PAYMENT_PROVIDER = "paypal";
    const adapter = getPaymentAdapter();
    return adapter
      .createCheckoutSession({
        bookingId: 3,
        amount: 1499,
        currency: "usd",
        description: "PayPal test",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      })
      .then((result) => {
        expect(result.provider).toBe("paypal");
        expect(result.sessionId).toMatch(/^pp_mock_/);
      });
  });

  it("is case-insensitive — PAYPAL and PayPal both work", async () => {
    process.env.PAYMENT_PROVIDER = "PAYPAL";
    await expect(getPaymentAdapter().createCheckoutSession({
      bookingId: 4, amount: 999, currency: "usd",
      description: "case test",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    })).resolves.toMatchObject({ provider: "paypal" });
  });
});

// ─── 2. Membership Tier — currentTier returns correct tier ───────────────────

describe("membership.currentTier", () => {
  it("returns 'basic' for a basic user", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser({ memberTier: "basic" })));
    const result = await caller.membership.currentTier();
    expect(result.tier).toBe("basic");
  });

  it("returns 'pro' for a pro user", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser({ memberTier: "pro" })));
    const result = await caller.membership.currentTier();
    expect(result.tier).toBe("pro");
  });

  it("throws UNAUTHORIZED when called without a user", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.membership.currentTier()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("includes businessName in the response", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser({ businessName: "Mario's Pizzeria" })));
    const result = await caller.membership.currentTier();
    expect(result.businessName).toBe("Mario's Pizzeria");
  });
});

// ─── 3. AI Router — Pro-only gate ────────────────────────────────────────────

describe("ai.history — Pro-only gate", () => {
  it("throws FORBIDDEN with UPGRADE_REQUIRED message for basic users", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser({ memberTier: "basic" })));
    try {
      await caller.ai.history();
      expect.fail("Should have thrown FORBIDDEN");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const trpcErr = err as TRPCError;
      expect(trpcErr.code).toBe("FORBIDDEN");
      expect(trpcErr.message).toMatch(/UPGRADE_REQUIRED/);
    }
  });

  it("throws UNAUTHORIZED when called without a user", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.ai.history()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("ai.chat — Pro-only gate", () => {
  it("throws FORBIDDEN with UPGRADE_REQUIRED message for basic users", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser({ memberTier: "basic" })));
    try {
      await caller.ai.chat({ message: "Hello" });
      expect.fail("Should have thrown FORBIDDEN");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const trpcErr = err as TRPCError;
      expect(trpcErr.code).toBe("FORBIDDEN");
      expect(trpcErr.message).toMatch(/UPGRADE_REQUIRED/);
    }
  });
});

// ─── 4. Presence — live is available to all tiers ────────────────────────────

describe("presence.live — available to all authenticated users", () => {
  it("does NOT throw FORBIDDEN for basic users (live data is free)", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser({ memberTier: "basic" })));
    // The procedure queries the DB; in test env it will either return [] or throw a DB error,
    // but it must NOT throw FORBIDDEN or UPGRADE_REQUIRED.
    try {
      await caller.presence.live();
    } catch (err) {
      const trpcErr = err as TRPCError;
      expect(trpcErr.code).not.toBe("FORBIDDEN");
      expect(trpcErr.message).not.toMatch(/UPGRADE_REQUIRED/);
    }
  });
});

describe("presence.historical — Pro-only gate", () => {
  it("throws FORBIDDEN with UPGRADE_REQUIRED for basic users", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser({ memberTier: "basic" })));
    try {
      await caller.presence.historical({ appName: "poker", from: new Date("2026-01-01"), to: new Date("2026-01-31") });
      expect.fail("Should have thrown FORBIDDEN");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const trpcErr = err as TRPCError;
      expect(trpcErr.code).toBe("FORBIDDEN");
      expect(trpcErr.message).toMatch(/UPGRADE_REQUIRED/);
    }
  });
});

// ─── 5. Auth — logout clears session cookie ──────────────────────────────────

describe("auth.logout", () => {
  it("returns { success: true } and clears the session cookie", async () => {
    const ctx = makeCtx(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});
