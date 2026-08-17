import type { CreateEventInput, EventCard, EventDetail, RsvpInput } from "./types";

// Vite replaces import.meta.env.VITE_API_URL at build time. Fall back to /api
// for SSR / test environments where import.meta is unavailable.
const API_BASE: string = (() => {
  try {
    return (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ?? "/api";
  } catch {
    return "/api";
  }
})();

// Shared with the shell's session helper (apps/shell/src/home/api.ts) so a host
// signed in on the storefront is already authenticated here.
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
  constructor(public status: number) {
    super(`Request failed (${status})`);
  }
}

async function request<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body) headers["Content-Type"] = "application/json";
  if (auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) throw new ApiError(res.status);
  // 200/201 always carry JSON here; guard just in case.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Establish the demo session token (used when a host isn't signed in yet). */
export async function demoLogin(): Promise<void> {
  const res = await request<{ token: string }>("/home/demo-login", { method: "POST" });
  setToken(res.token);
}

export function listMyEvents(): Promise<{ events: EventCard[] }> {
  return request("/events", {}, true);
}

export function createEvent(input: CreateEventInput): Promise<EventCard> {
  return request("/events", { method: "POST", body: JSON.stringify(input) }, true);
}

export function getEvent(eventId: string): Promise<EventDetail> {
  return request(`/events/${encodeURIComponent(eventId)}`);
}

export function submitRsvp(eventId: string, input: RsvpInput): Promise<EventDetail> {
  return request(`/events/${encodeURIComponent(eventId)}/rsvp`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
