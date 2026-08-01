import { getCampaignsByAdvertiser, getCampaignStats } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

// Bookings that count as live campaigns for spend/active stats.
const LIVE_CAMPAIGN_STATUSES = ["approved", "active", "completed"] as const;

export const campaignsRouter = router({
  // "My Campaigns" shows every booking (including pending_payment /
  // pending_moderation), so the list is unfiltered by status.
  list: protectedProcedure.query(async ({ ctx }) => {
    return getCampaignsByAdvertiser(ctx.user.id);
  }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const [stats, campaigns] = await Promise.all([
      getCampaignStats(ctx.user.id),
      getCampaignsByAdvertiser(ctx.user.id, { statuses: LIVE_CAMPAIGN_STATUSES }),
    ]);
    const totalSpend = campaigns.reduce((sum, c) => sum + parseFloat(c.totalPrice), 0);
    const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
    return { ...stats, totalSpend: Math.round(totalSpend * 100) / 100, activeCampaigns };
  }),
});

