import { z } from "zod";
import { upgradeMemberTier, updateUserProfile } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const membershipRouter = router({
  currentTier: protectedProcedure.query(({ ctx }) => ({
    tier: ctx.user.memberTier ?? "basic",
    businessName: ctx.user.businessName,
    businessCategory: ctx.user.businessCategory,
    phone: ctx.user.phone,
  })),

  upgrade: protectedProcedure
    .input(z.object({ tier: z.enum(["basic", "pro"]) }))
    .mutation(async ({ ctx, input }) => {
      await upgradeMemberTier(ctx.user.id, input.tier);
      return { success: true, tier: input.tier };
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        businessName: z.string().max(255).optional(),
        businessCategory: z.string().max(128).optional(),
        phone: z.string().max(32).optional(),
        name: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateUserProfile(ctx.user.id, input);
      return { success: true };
    }),
});

