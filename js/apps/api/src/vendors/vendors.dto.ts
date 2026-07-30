/**
 * Data Transfer Objects for the Vendors module.
 * Using plain classes with optional validation decorators (no class-validator
 * dependency yet — add when the project adopts it globally).
 */

export class CreateVendorDto {
  declare businessName: string;
  declare category: string;
  declare citySlug: string;
  declare descriptionMarkdown?: string;
  declare address?: string;
  declare searchTags?: string[];
  declare categoryData?: Record<string, unknown>;
  declare contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  declare location?: {
    longitude: number;
    latitude: number;
  };
}

export class UpdateVendorDto {
  declare businessName?: string;
  declare category?: string;
  declare descriptionMarkdown?: string;
  declare address?: string;
  declare searchTags?: string[];
  declare categoryData?: Record<string, unknown>;
  declare contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  declare location?: {
    longitude: number;
    latitude: number;
  };
  declare images?: string[];
}

export class BrowseVendorsQueryDto {
  /** City slug to filter by, e.g. "seattle" */
  declare citySlug: string;
  /** Optional category filter */
  declare category?: string;
  /** Optional free-text search across businessName and searchTags */
  declare q?: string;
  /** Pagination */
  declare page?: number;
  declare limit?: number;
  /** Geo-proximity: lat,lng,radiusKm */
  declare lat?: number;
  declare lng?: number;
  declare radiusKm?: number;
}
