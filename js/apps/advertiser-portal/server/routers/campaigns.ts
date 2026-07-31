import { getCampaignsByAdvertiser, getCampaignStats } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const campaignsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getCampaignsByAdvertiser(ctx.user.id);
  }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const [stats, campaigns] = await Promise.all([
      getCampaignStats(ctx.user.id),
      getCampaignsByAdvertiser(ctx.user.id),
    ]);
    const totalSpend = campaigns.reduce((sum, c) => sum + parseFloat(c.totalPrice), 0);
    const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
    return { ...stats, totalSpend: Math.round(totalSpend * 100) / 100, activeCampaigns };
  }),
});

