import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User, UserDocument } from "../../database";
import { mintSession, signState, verifyState } from "../../common/session";
import {
  enabledProviders,
  findProvider,
  isProviderEnabled,
  providerCredentials,
  redirectBase,
  type ProviderDef,
} from "./oauth.config";

/** True when the dev-only stub sign-in is available (for the providers listing). */
function stubEnabled(): boolean {
  return process.env["ALLOW_STUB_AUTH"] === "true" && process.env["NODE_ENV"] !== "production";
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  /** Providers the client should offer — only those actually configured. */
  listProviders(): { providers: Array<{ id: string; label: string }>; stub: boolean } {
    return {
      providers: enabledProviders().map((p) => ({ id: p.id, label: p.label })),
      stub: stubEnabled(),
    };
  }

  private callbackUri(def: ProviderDef, origin: string): string {
    const base = redirectBase() || origin.replace(/\/+$/, "");
    return `${base}/api/members/auth/${def.id}/callback`;
  }

  /** Build the provider authorize URL (with signed state), or 404 when not configured. */
  buildAuthUrl(providerId: string, redirectPath: string, origin: string): string {
    const def = findProvider(providerId);
    if (!def || !isProviderEnabled(def)) {
      throw new NotFoundException("This sign-in provider isn't configured.");
    }
    const creds = providerCredentials(def)!;
    const state = signState({ p: def.id, r: sanitizeRedirect(redirectPath) });
    const params = new URLSearchParams({
      client_id: creds.clientId,
      redirect_uri: this.callbackUri(def, origin),
      response_type: "code",
      scope: def.scope,
      state,
    });
    return `${def.authUrl}?${params.toString()}`;
  }

  /**
   * Handle the provider callback: exchange the code, fetch userinfo, find-or-create
   * the user, and mint a real signed session. Returns the app path to redirect to
   * with the token in the URL fragment for the SPA to consume.
   */
  async handleCallback(
    providerId: string,
    code: string | undefined,
    state: string | undefined,
    origin: string,
  ): Promise<string> {
    const def = findProvider(providerId);
    if (!def || !isProviderEnabled(def)) throw new NotFoundException("This sign-in provider isn't configured.");
    const creds = providerCredentials(def)!;

    const parsed = verifyState(state);
    if (!parsed || parsed.p !== def.id) throw new BadRequestException("Invalid or expired sign-in state.");
    const redirectPath = sanitizeRedirect(typeof parsed.r === "string" ? parsed.r : "/marketplace");
    if (!code) throw new BadRequestException("Missing authorization code.");

    // 1. Exchange the code for an access token.
    const tokenRes = await fetch(def.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.callbackUri(def, origin),
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
      }).toString(),
    });
    if (!tokenRes.ok) {
      this.logger.warn(`${def.id} token exchange failed: ${tokenRes.status}`);
      return `${redirectPath}#mh_error=signin_failed`;
    }
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenJson.access_token;
    if (!accessToken) return `${redirectPath}#mh_error=signin_failed`;

    // 2. Fetch the user's profile.
    const infoRes = await fetch(def.userInfoUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!infoRes.ok) {
      this.logger.warn(`${def.id} userinfo failed: ${infoRes.status}`);
      return `${redirectPath}#mh_error=signin_failed`;
    }
    const { email, name } = def.parseUser((await infoRes.json()) as Record<string, unknown>);
    if (!email) return `${redirectPath}#mh_error=no_email`;

    // 3. Find-or-create the user and mint a signed session.
    const lowerEmail = email.toLowerCase();
    let user = await this.userModel.findOne({ email: lowerEmail }).exec();
    if (!user) {
      user = await new this.userModel({
        email: lowerEmail,
        displayName: name || lowerEmail,
        defaultHandle: lowerEmail.split("@")[0],
        passwordHash: null,
        oauthProviders: [{ provider: def.id, providerId: lowerEmail }],
      }).save();
    }
    const token = mintSession((user._id as Types.ObjectId).toHexString());
    return `${redirectPath}#mh_token=${encodeURIComponent(token)}`;
  }
}

/** Only allow same-app relative redirect paths (no open-redirect to other origins). */
function sanitizeRedirect(path: unknown): string {
  const p = typeof path === "string" ? path : "";
  // Must be a single-slash-rooted path (reject "//host" and absolute URLs).
  if (!p.startsWith("/") || p.startsWith("//")) return "/marketplace";
  return p;
}
