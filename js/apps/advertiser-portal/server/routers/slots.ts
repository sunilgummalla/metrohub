import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getAllAdSlots, getLivePresence, createBooking, setBookingPaymentSession, getBookingsByAdvertiser, getBookingsForSlot } from "../db";
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
    .input(z.object({ slotId: z.string(), month: z.number().int().min(1).max(12), year: z.number().int() }))
    .query(async ({ input }) => {
      // Booked days = every day-of-month covered by a non-cancelled booking on this
      // slot that overlaps the requested month, across all advertisers.
      const monthStart = new Date(input.year, input.month - 1, 1, 0, 0, 0, 0);
      const monthEnd = new Date(input.year, input.month, 0, 23, 59, 59, 999);

      const slotBookings = await getBookingsForSlot(input.slotId, monthStart, monthEnd);

      const bookedDays = new Set<number>();
      for (const booking of slotBookings) {
        const bStart = new Date(booking.startDate);
        const bEnd = new Date(booking.endDate);
        const rangeStart = bStart > monthStart ? bStart : monthStart;
        const rangeEnd = bEnd < monthEnd ? bEnd : monthEnd;
        const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
        while (cursor <= rangeEnd) {
          if (cursor.getMonth() === input.month - 1 && cursor.getFullYear() === input.year) {
            bookedDays.add(cursor.getDate());
          }
          cursor.setDate(cursor.getDate() + 1);
        }
      }

      return {
        slotId: input.slotId,
        month: input.month,
        year: input.year,
        bookedDays: Array.from(bookedDays).sort((a, b) => a - b),
      };
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

      // Reject reversed ranges — otherwise they'd silently price as 1 day.
      if (input.endDate.getTime() < input.startDate.getTime()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "endDate must be on or after startDate" });
      }

      // Prevent double-booking: reject if any non-cancelled booking already
      // overlaps the requested range (consistent with the availability calendar).
      const overlapping = await getBookingsForSlot(input.slotId, input.startDate, input.endDate);
      if (overlapping.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "SLOT_UNAVAILABLE: this slot is already booked for the selected dates",
        });
      }

      // Bill by inclusive calendar days so pricing matches the availability
      // calendar (which marks every day-of-month the booking covers).
      const startDay = new Date(
        input.startDate.getFullYear(), input.startDate.getMonth(), input.startDate.getDate()
      ).getTime();
      const endDay = new Date(
        input.endDate.getFullYear(), input.endDate.getMonth(), input.endDate.getDate()
      ).getTime();
      const days = Math.round((endDay - startDay) / 86400000) + 1;
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
      const bookingId = bookingResult?.id ?? 0;

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

      // Persist the provider session id so the payment webhook/return flow can
      // reconcile provider events back to this booking. The booking stays in
      // `pending_payment` — it only advances to `pending_moderation` once
      // payment success is confirmed (webhook), so unpaid bookings never enter
      // the moderation queue.
      if (bookingId > 0 && session.sessionId) {
        await setBookingPaymentSession(bookingId, session.sessionId);
      }

      return { success: true, checkoutUrl: session.checkoutUrl, totalPrice, days };
    }),

  myBookings: protectedProcedure.query(async ({ ctx }) => {
    return getBookingsByAdvertiser(ctx.user.id);
  }),
});
