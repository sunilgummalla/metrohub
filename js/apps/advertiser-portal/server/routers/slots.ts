import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getAllAdSlots, getLivePresence, createBooking, updateBookingStatus, getBookingsByAdvertiser } from "../db";
import { getPaymentAdapter } from "../payment";
import { protectedProcedure, router } from "../_core/trpc";

export const slotsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const [slots, livePresence] = await Promise.all([
      getAllAdSlots(),
      getLivePresence(),
    ]);
    const presenceMap = Object.fromEntries(livePresence.map((p) => [p.appName, p.count]));

    return slots.map((slot) => ({
      ...slot,
      liveAudience: presenceMap[slot.appName ?? "shell"] ?? 0,
      isProRequired: slot.requiresPro === "yes",
      canBook: slot.requiresPro === "no" || (ctx.user.memberTier ?? "basic") === "pro",
    }));
  }),

  availability: protectedProcedure
    .input(z.object({ slotId: z.string(), month: z.number(), year: z.number() }))
    .query(async ({ input }) => {
      // Query bookings table for the given slot/month to find booked dates
      const allBookings = await getBookingsByAdvertiser(0); // pass 0 to get all (see db helper)
      // For availability we need all bookings for this slot, not just one advertiser's
      // This is a simplified check — production would query across all advertisers
      const bookedDays: number[] = [];
      return { slotId: input.slotId, month: input.month, year: input.year, bookedDays };
    }),

  bookSlot: protectedProcedure
    .input(
      z.object({
        slotId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
        creativeCopy: z.string().max(200).optional(),
        creativeClickUrl: z.string().url().optional(),
        creativeImageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slots = await getAllAdSlots();
      const slot = slots.find((s) => s.slotId === input.slotId);
      if (!slot) throw new TRPCError({ code: "NOT_FOUND", message: "Slot not found" });

      // Gate Pro-only slots
      if (slot.requiresPro === "yes" && (ctx.user.memberTier ?? "basic") !== "pro") {
        throw new TRPCError({ code: "FORBIDDEN", message: "UPGRADE_REQUIRED:hero_banner" });
      }

      const days = Math.max(
        1,
        Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / 86400000)
      );
      const totalPrice = (parseFloat(slot.basePricePerDay) * days).toFixed(2);

      // Create booking record
      const bookingResult = await createBooking({
        advertiserId: ctx.user.id,
        slotId: input.slotId,
        startDate: input.startDate,
        endDate: input.endDate,
        totalPrice,
        status: "pending_payment",
        paymentProvider: process.env.PAYMENT_PROVIDER ?? "stripe",
        creativeCopy: input.creativeCopy,
        creativeClickUrl: input.creativeClickUrl,
        creativeImageUrl: input.creativeImageUrl,
      });
      const bookingId = (bookingResult as { insertId?: number })?.insertId ?? 0;

      // Create payment session
      const adapter = getPaymentAdapter();
      const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
      const session = await adapter.createCheckoutSession({
        bookingId,
        amount: Math.round(parseFloat(totalPrice) * 100),
        currency: "usd",
        description: `MetroHub ${slot.name} — ${days} day(s)`,
        successUrl: `${baseUrl}/campaigns?payment=success`,
        cancelUrl: `${baseUrl}/slots?payment=cancelled`,
      });
      // Mark booking as pending moderation once payment session is created
      if (bookingId > 0) {
        await updateBookingStatus(bookingId, "pending_moderation");
      }

      return { success: true, checkoutUrl: session.checkoutUrl, totalPrice, days };
    }),

  myBookings: protectedProcedure.query(async ({ ctx }) => {
    return getBookingsByAdvertiser(ctx.user.id);
  }),
});
