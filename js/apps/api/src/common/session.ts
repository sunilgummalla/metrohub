import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { parseStubBearerToken } from "./stub-auth";

/**
 * Signed session tokens for real (OAuth) logins.
 *
 * Format: `mh1.<base64url(payload)>.<base64url(hmac)>` where payload is
 * `{ sub: <userId>, iat: <ms> }`. Unlike the dev-only `stub-token-<id>` scheme,
 * these are cryptographically signed, so member endpoints accept them in any
 * environment (a forged token can't pass HMAC verification).
 *
 * The signing key is MH_SESSION_SECRET. If it's unset we fall back to a random
 * per-process key so nothing breaks — tokens simply don't survive a restart.
 * Set MH_SESSION_SECRET in deployed environments for stable sessions.
 */
const SECRET: string = process.env["MH_SESSION_SECRET"] || randomBytes(32).toString("hex");
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function sign(payloadB64: string): string {
  return b64url(createHmac("sha256", SECRET).update(payloadB64).digest());
}

/** Extract the raw token from an `Authorization: Bearer <token>` header. */
export function extractBearer(header: string | string[] | undefined): string | null {
  const h = Array.isArray(header) ? header[0] : header;
  if (!h) return null;
  const m = /^Bearer\s+(\S.*)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

/** Mint a signed session token for a user id (24-hex). */
export function mintSession(userId: string): string {
  const payload = b64url(Buffer.from(JSON.stringify({ sub: userId, iat: Date.now() })));
  return `mh1.${payload}.${sign(payload)}`;
}

/** Verify a signed session token and return its user id, or null when invalid/expired. */
export function verifySession(token: string | null | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "mh1") return null;
  const [, payloadB64, sigB64] = parts;
  const expected = sign(payloadB64);
  // Constant-time compare; lengths must match for timingSafeEqual.
  if (sigB64.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sigB64), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    const sub = typeof payload?.sub === "string" ? payload.sub : null;
    const iat = typeof payload?.iat === "number" ? payload.iat : 0;
    if (!sub || !/^[a-f0-9]{24}$/i.test(sub)) return null;
    if (Date.now() - iat > MAX_AGE_MS) return null;
    return sub.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Sign/verify short-lived opaque state for the OAuth redirect (CSRF + carries
 * the post-login redirect path). Reuses the session secret.
 */
export function signState(data: Record<string, unknown>): string {
  const payload = b64url(Buffer.from(JSON.stringify({ ...data, ts: Date.now() })));
  return `${payload}.${sign(payload)}`;
}
export function verifyState(state: string | undefined, maxAgeMs = 10 * 60 * 1000): Record<string, unknown> | null {
  if (!state) return null;
  const [payloadB64, sigB64] = state.split(".");
  if (!payloadB64 || !sigB64) return null;
  const expected = sign(payloadB64);
  if (sigB64.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sigB64), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    if (typeof data?.ts !== "number" || Date.now() - data.ts > maxAgeMs) return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Resolve a member id from an Authorization header.
 *
 * A valid signed OAuth session is accepted in ANY environment. The dev-only
 * `stub-token-<id>` scheme is accepted only when ALLOW_STUB_AUTH=true and
 * NODE_ENV !== "production". Returns null when neither applies.
 */
export function resolveMemberId(header: string | string[] | undefined): string | null {
  const real = verifySession(extractBearer(header));
  if (real) return real;
  const stubOk = process.env["ALLOW_STUB_AUTH"] === "true" && process.env["NODE_ENV"] !== "production";
  return stubOk ? parseStubBearerToken(header) : null;
}
