import type { CreateVendorInput, MyListing, Provider, Session } from "./types";

// The experience app proxies /api/* to the API service (see next.config.mjs),
// so calls stay same-origin.
const API_BASE = "/api";
const TOKEN_KEY = "mh-session-token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export class ApiError extends Error {
  constructor(public status: number, message?: string) {
    super(message ?? `Request failed (${status})`);
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    const m = body?.message;
    return Array.isArray(m) ? m.join(", ") : m ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function getAuthProviders(): Promise<{ providers: Array<{ id: Provider; label: string }>; stub: boolean }> {
  const res = await fetch(`${API_BASE}/members/auth/providers`);
  if (!res.ok) return { providers: [], stub: false };
  return res.json() as Promise<{ providers: Array<{ id: Provider; label: string }>; stub: boolean }>;
}

export function startOAuth(provider: Provider, redirectPath: string): void {
  window.location.assign(`${API_BASE}/members/auth/${provider}/start?redirect=${encodeURIComponent(redirectPath)}`);
}

export function consumeOAuthRedirect(): { status: "ok" } | { status: "error"; code: string } | null {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const token = params.get("mh_token");
  const err = params.get("mh_error");
  if (!token && !err) return null;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  if (token) {
    setToken(token);
    return { status: "ok" };
  }
  return { status: "error", code: err ?? "signin_failed" };
}

/** Dev-only stub sign-in (used when no real OAuth provider is configured). */
export async function providerSignIn(provider: Provider): Promise<Session> {
  const res = await fetch(`${API_BASE}/members/oauth/${provider}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new ApiError(res.status, await readError(res));
  const session = (await res.json()) as Session;
  setToken(session.token);
  return session;
}

export function signOut(): void {
  setToken(null);
}

// ─── Listings ───────────────────────────────────────────────────────────────

export async function listMyVendors(): Promise<MyListing[]> {
  const t = getToken();
  const res = await fetch(`${API_BASE}/vendors/mine`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
  if (res.status === 401) {
    setToken(null);
    throw new ApiError(401, "Please sign in again");
  }
  if (!res.ok) throw new ApiError(res.status, await readError(res));
  return res.json() as Promise<MyListing[]>;
}

export async function createVendor(input: CreateVendorInput): Promise<MyListing> {
  const t = getToken();
  const res = await fetch(`${API_BASE}/vendors`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: JSON.stringify(input),
  });
  if (res.status === 401) {
    setToken(null);
    throw new ApiError(401, "Please sign in again");
  }
  if (!res.ok) throw new ApiError(res.status, await readError(res));
  return res.json() as Promise<MyListing>;
}
