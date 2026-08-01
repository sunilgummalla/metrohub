import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { membershipRouter } from "./routers/membership";
import { presenceRouter } from "./routers/presence";
import { slotsRouter } from "./routers/slots";
import { campaignsRouter } from "./routers/campaigns";
import { aiRouter } from "./routers/ai";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  membership: membershipRouter,
  presence: presenceRouter,
  slots: slotsRouter,
  campaigns: campaignsRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
