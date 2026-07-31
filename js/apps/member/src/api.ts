// ─── API client for the Member Portal ────────────────────────────────────────
// All requests go to /api (proxied to the NestJS API in dev, nginx in prod).

const BASE = "/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MemberSession {
  memberId: string;
  email: string;
  businessName: string;
  token: string;
}

export interface VendorProfile {
  _id: string;
  businessName: string;
  category: string;
  citySlug: string;
  address?: string;
  descriptionMarkdown?: string;
  categoryData: Record<string, unknown>;
  searchTags: string[];
  images: string[];
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  status: "pending" | "approved" | "rejected" | "suspended";
  featured: boolean;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface RegisterPayload {
  businessName: string;
  category: string;
  citySlug: string;
  email: string;
  password: string;
  phone?: string;
  website?: string;
  address?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("mh_member_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Parses a fetch Response, handling both JSON and empty-body responses.
 *
 * Uses `res.text()` first to avoid `SyntaxError` when the body is empty —
 * this can happen even when `content-type: application/json` is set (e.g.
 * with chunked transfer encoding where `content-length` is absent), or on
 * 204 No Content responses such as forgot-password and DELETE /me/images.
 */
async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();

  if (!res.ok) {
    let message: string | undefined;
    try {
      const body = JSON.parse(text) as { message?: string };
      message = body.message;
    } catch {
      // body was not JSON — fall through to generic message
    }
    throw new Error(message ?? `Request failed: ${res.status}`);
  }

  // Empty body (e.g. 204, forgot-password, DELETE /me/images) — return undefined
  if (!text) return undefined as unknown as T;

  return JSON.parse(text) as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function register(payload: RegisterPayload): Promise<MemberSession> {
  const res = await fetch(`${BASE}/members/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<MemberSession>(res);
}

export async function login(payload: LoginPayload): Promise<MemberSession> {
  const res = await fetch(`${BASE}/members/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<MemberSession>(res);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const res = await fetch(`${BASE}/members/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return handleResponse<void>(res);
}

// ─── Vendor profile ───────────────────────────────────────────────────────────

export async function getMyProfile(): Promise<VendorProfile> {
  const res = await fetch(`${BASE}/members/me`, {
    headers: authHeaders(),
  });
  return handleResponse<VendorProfile>(res);
}

export async function updateMyProfile(
  data: Partial<Omit<VendorProfile, "_id" | "status" | "featured">>,
): Promise<VendorProfile> {
  const res = await fetch(`${BASE}/members/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse<VendorProfile>(res);
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/members/me/images`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  return handleResponse<{ url: string }>(res);
}

export async function deleteImage(url: string): Promise<void> {
  const res = await fetch(`${BASE}/members/me/images`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ url }),
  });
  return handleResponse<void>(res);
}

/**
 * Fetches the list of vendor categories for a given city.
 * citySlug is encoded via URLSearchParams to handle special characters safely.
 */
export async function getCategories(citySlug: string): Promise<string[]> {
  const params = new URLSearchParams({ citySlug });
  const res = await fetch(`${BASE}/vendors/categories?${params.toString()}`);
  return handleResponse<string[]>(res);
}
