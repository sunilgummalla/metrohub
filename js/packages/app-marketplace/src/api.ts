import type {
  BrowseFilters,
  BrowseResponse,
  CreateVendorInput,
  MyListing,
  Provider,
  Session,
  Vendor,
} from "./types";

// Vite replaces import.meta.env.VITE_API_URL at build time.
// Fall back to /api for SSR / test environments where import.meta is unavailable.
const API_BASE: string = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (import.meta as any).env?.VITE_API_URL ?? "/api";
  } catch {
    return "/api";
  }
})();

// Shared with the shell's session helper so a member signed in here is
// recognized across the app.
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
    return Array.isArray(m) ? m.join(", ") : (m ?? `Request failed (${res.status})`);
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function browseVendors(filters: BrowseFilters): Promise<BrowseResponse> {
  const params = new URLSearchParams();
  params.set("citySlug", filters.citySlug);
  if (filters.category) params.set("category", filters.category);
  if (filters.q) params.set("q", filters.q);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.openToSponsorships) params.set("openToSponsorships", "true");

  const res = await fetch(`${API_BASE}/vendors?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to browse vendors: ${res.status}`);
  return res.json() as Promise<BrowseResponse>;
}

// ─── Onboarding (member auth + own listings) ────────────────────────────────

/** Which real OAuth providers are configured, plus whether the dev stub is on. */
export async function getAuthProviders(): Promise<{ providers: Array<{ id: Provider; label: string }>; stub: boolean }> {
  const res = await fetch(`${API_BASE}/members/auth/providers`);
  if (!res.ok) return { providers: [], stub: false };
  return res.json() as Promise<{ providers: Array<{ id: Provider; label: string }>; stub: boolean }>;
}

/** Kick off the real OAuth redirect flow for a configured provider. */
export function startOAuth(provider: Provider, redirectPath: string): void {
  const url = `${API_BASE}/members/auth/${provider}/start?redirect=${encodeURIComponent(redirectPath)}`;
  window.location.assign(url);
}

/**
 * On returning from an OAuth redirect the token/error arrives in the URL hash
 * (#mh_token=… / #mh_error=…). Consume it: store the token and clear the hash.
 * Returns "ok" | "error" | null (no OAuth hash present).
 */
export function consumeOAuthRedirect(): { status: "ok" } | { status: "error"; code: string } | null {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const token = params.get("mh_token");
  const err = params.get("mh_error");
  if (!token && !err) return null;
  // Strip the hash so the token doesn't linger in history / on reload.
  const clean = window.location.pathname + window.location.search;
  window.history.replaceState(null, "", clean);
  if (token) {
    setToken(token);
    return { status: "ok" };
  }
  return { status: "error", code: err ?? "signin_failed" };
}

/** Stub provider sign-in (dev only) — stores the returned session token. */
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

export async function listMyVendors(): Promise<MyListing[]> {
  const t = getToken();
  const res = await fetch(`${API_BASE}/vendors/mine`, {
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  });
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
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: JSON.stringify(input),
  });
  if (res.status === 401) {
    setToken(null);
    throw new ApiError(401, "Please sign in again");
  }
  if (!res.ok) throw new ApiError(res.status, await readError(res));
  return res.json() as Promise<MyListing>;
}

export async function getVendor(id: string): Promise<Vendor> {
  const res = await fetch(`${API_BASE}/vendors/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch vendor ${id}: ${res.status}`);
  return res.json() as Promise<Vendor>;
}

export async function getCategories(citySlug: string): Promise<string[]> {
  // Use URLSearchParams to safely encode citySlug (consistent with browseVendors)
  const params = new URLSearchParams({ citySlug });
  const res = await fetch(`${API_BASE}/vendors/categories?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
  return res.json() as Promise<string[]>;
}
