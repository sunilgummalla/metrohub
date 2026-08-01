import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getLivePresence, getHistoricalPresence } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const presenceRouter = router({
  live: protectedProcedure.query(async () => {
    return getLivePresence();
  }),

  historical: protectedProcedure
    .input(
      z.object({
        appName: z.string(),
        from: z.date(),
        to: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Pro-only feature
      if ((ctx.user.memberTier ?? "basic") !== "pro") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "UPGRADE_REQUIRED:historical_analytics",
        });
      }
      return getHistoricalPresence(input.appName, input.from, input.to);
    }),
});

