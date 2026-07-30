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

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
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

export async function getCategories(): Promise<string[]> {
  const res = await fetch(`${BASE}/vendors/categories?citySlug=seattle`);
  return handleResponse<string[]>(res);
}
