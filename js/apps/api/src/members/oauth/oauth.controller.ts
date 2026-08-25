import { Controller, Get, Param, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { OAuthService } from "./oauth.service";

/**
 * Real OAuth sign-in (authorization-code flow), enabled per provider only when
 * its client credentials are configured (see oauth.config.ts). Effective URLs
 * (global "api" prefix):
 *   GET /api/members/auth/providers          — which providers are available
 *   GET /api/members/auth/:provider/start     — 302 to the provider's consent page
 *   GET /api/members/auth/:provider/callback  — provider redirect; mints a session
 */
@Controller("members/auth")
export class OAuthController {
  constructor(private readonly oauth: OAuthService) {}

  @Get("providers")
  providers() {
    return this.oauth.listProviders();
  }

  @Get(":provider/start")
  start(
    @Param("provider") provider: string,
    @Query("redirect") redirect: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = this.oauth.buildAuthUrl(provider, redirect ?? "/marketplace", originOf(req));
    res.redirect(url);
  }

  @Get(":provider/callback")
  async callback(
    @Param("provider") provider: string,
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const target = await this.oauth.handleCallback(provider, code, state, originOf(req));
    res.redirect(target);
  }
}

/** App origin, honoring the reverse proxy's forwarded headers. */
function originOf(req: Request): string {
  const proto = firstHeader(req.headers["x-forwarded-proto"]) ?? req.protocol ?? "https";
  const host = firstHeader(req.headers["x-forwarded-host"]) ?? req.headers["host"] ?? "";
  return `${proto}://${host}`;
}
function firstHeader(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s ? s.split(",")[0].trim() : undefined;
}
