/**
 * OAuth provider registry.
 *
 * Endpoints are well-known and hardcoded per provider; only the client
 * credentials come from env, so a provider is "enabled" iff BOTH its client id
 * and secret are configured. Nothing here throws when config is missing —
 * unconfigured providers are simply omitted from the enabled set, so the build
 * and the app run fine with zero, some, or all providers configured.
 */

export type ProviderId = "google" | "instagram" | "amazon" | "entra-work" | "entra-personal";

export interface ProviderDef {
  id: ProviderId;
  label: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
  /** Env var prefix, e.g. "GOOGLE" → OAUTH_GOOGLE_CLIENT_ID / _CLIENT_SECRET. */
  envKey: string;
  /** Extract { email, name } from the provider's userinfo response. */
  parseUser: (info: Record<string, unknown>) => { email: string; name: string };
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

// Microsoft Entra: "organizations" = work/school tenants, "consumers" = personal
// Microsoft accounts. Same app registration, different authority path.
const entra = (tenant: string) => ({
  authUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
  tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
  userInfoUrl: "https://graph.microsoft.com/oidc/userinfo",
  scope: "openid email profile",
  parseUser: (i: Record<string, unknown>) => ({
    email: str(i.email) || str(i.preferred_username),
    name: str(i.name) || str(i.email),
  }),
});

export const PROVIDERS: ProviderDef[] = [
  {
    id: "google",
    label: "Google",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
    envKey: "GOOGLE",
    parseUser: (i) => ({ email: str(i.email), name: str(i.name) || str(i.email) }),
  },
  {
    // Login with Amazon (LWA).
    id: "amazon",
    label: "Amazon",
    authUrl: "https://www.amazon.com/ap/oa",
    tokenUrl: "https://api.amazon.com/auth/o2/token",
    userInfoUrl: "https://api.amazon.com/user/profile",
    scope: "profile",
    envKey: "AMAZON",
    parseUser: (i) => ({ email: str(i.email), name: str(i.name) || str(i.email) }),
  },
  {
    // Instagram via Facebook Login (Graph). Requires a configured Meta app.
    id: "instagram",
    label: "Instagram",
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    userInfoUrl: "https://graph.facebook.com/v19.0/me?fields=id,name,email",
    scope: "email public_profile",
    envKey: "INSTAGRAM",
    parseUser: (i) => ({ email: str(i.email), name: str(i.name) }),
  },
  { id: "entra-work", label: "Microsoft — Work", envKey: "ENTRA", ...entra("organizations") },
  { id: "entra-personal", label: "Microsoft — Personal", envKey: "ENTRA", ...entra("consumers") },
];

export interface ProviderCredentials {
  clientId: string;
  clientSecret: string;
}

/** Reads a provider's client credentials from env, or null when not configured. */
export function providerCredentials(def: ProviderDef): ProviderCredentials | null {
  const clientId = process.env[`OAUTH_${def.envKey}_CLIENT_ID`];
  const clientSecret = process.env[`OAUTH_${def.envKey}_CLIENT_SECRET`];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/** True when a provider has both a client id and secret configured. */
export function isProviderEnabled(def: ProviderDef): boolean {
  return providerCredentials(def) !== null;
}

/** The providers that are actually configured (safe to offer to clients). */
export function enabledProviders(): ProviderDef[] {
  return PROVIDERS.filter(isProviderEnabled);
}

export function findProvider(id: string): ProviderDef | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/**
 * Base URL the provider should redirect back to, e.g. "https://dev.metrohub.io".
 * Prefers OAUTH_REDIRECT_BASE; callers may fall back to the request origin.
 */
export function redirectBase(): string {
  return (process.env["OAUTH_REDIRECT_BASE"] ?? "").replace(/\/+$/, "");
}
