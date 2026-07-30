import type { BrowseFilters, BrowseResponse, Vendor } from "./types";

// Vite replaces import.meta.env at build time; fall back to /api for SSR/test environments
declare const __VITE_API_URL__: string | undefined;
const API_BASE: string = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (import.meta as any).env?.VITE_API_URL ?? "/api";
  } catch {
    return "/api";
  }
})();

export async function browseVendors(filters: BrowseFilters): Promise<BrowseResponse> {
  const params = new URLSearchParams();
  params.set("citySlug", filters.citySlug);
  if (filters.category) params.set("category", filters.category);
  if (filters.q) params.set("q", filters.q);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const res = await fetch(`${API_BASE}/vendors?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to browse vendors: ${res.status}`);
  return res.json() as Promise<BrowseResponse>;
}

export async function getVendor(id: string): Promise<Vendor> {
  const res = await fetch(`${API_BASE}/vendors/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch vendor ${id}: ${res.status}`);
  return res.json() as Promise<Vendor>;
}

export async function getCategories(citySlug: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/vendors/categories?citySlug=${citySlug}`);
  if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
  return res.json() as Promise<string[]>;
}
