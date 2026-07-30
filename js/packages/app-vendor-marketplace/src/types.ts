/** Mirrors the API Vendor document shape returned by GET /api/vendors */
export interface Vendor {
  _id: string;
  businessName: string;
  category: string;
  categoryData: Record<string, unknown>;
  descriptionMarkdown: string;
  images: string[];
  searchTags: string[];
  citySlug: string;
  address: string;
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  location?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  activeBoosters: Array<{ type: string; expiresAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface BrowseResponse {
  data: Vendor[];
  total: number;
}

export interface BrowseFilters {
  citySlug: string;
  category?: string;
  q?: string;
  page?: number;
  limit?: number;
}
