import { Controller, Get, HttpCode, Post, Query, Req, UnauthorizedException } from "@nestjs/common";
import { HomeService } from "./home.service";

/**
 * Home aggregation for the shell portal:
 *   POST /api/home/demo-login   -> a session token for the seeded demo user
 *   GET  /api/home/apps         -> public micro-app catalog (the registry)
 *   GET  /api/home/landing      -> public storefront payload (no auth)
 *   GET  /api/home/dashboard    -> personalized console payload (Bearer token)
 *
 * The token format (`stub-token-<userId>`) matches the members stub scheme so a
 * future real OAuth flow can drop in without changing the shell. demo-login and
 * dashboard are gated on SEED_SAMPLE_DATA (not NODE_ENV): they are enabled in
 * seeded demo/showcase environments — regardless of NODE_ENV — and return 403
 * where sample data isn't seeded, pending a real JWT/OAuth guard.
 */
@Controller("home")
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Post("demo-login")
  @HttpCode(200)
  demoLogin() {
    return this.homeService.demoLoginToken();
  }

  @Get("apps")
  apps() {
    return this.homeService.getApps();
  }

  @Get("landing")
  landing(@Query("citySlug") citySlug?: unknown) {
    // citySlug is validated/coerced in the service (qs can yield a non-string).
    return this.homeService.getLanding(citySlug);
  }

  @Get("dashboard")
  dashboard(@Req() req: { headers: Record<string, string | string[] | undefined> }) {
    const userId = extractUserId(req);
    return this.homeService.getDashboard(userId);
  }
}

/** Parse `Authorization: Bearer stub-token-<24hex>` and return the 24-hex user id. */
function extractUserId(req: { headers: Record<string, string | string[] | undefined> }): string {
  const raw = req.headers["authorization"] ?? req.headers["Authorization"];
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header) throw new UnauthorizedException("Missing Authorization header");
  const token = header.replace(/^Bearer\s+/i, "").trim();
  const match = /^stub-token-([a-f0-9]{24})$/i.exec(token);
  if (!match) throw new UnauthorizedException("Invalid session token");
  return match[1].toLowerCase();
}
