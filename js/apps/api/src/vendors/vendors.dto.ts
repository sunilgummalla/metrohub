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

/**
 * Query parameters for the vendor browse endpoint.
 *
 * Note: NestJS does not apply `transform: true` globally in this project, so
 * all query params arrive as strings. Numeric fields (page, limit, lat, lng,
 * radiusKm) are coerced explicitly in the service layer using `Number()` and
 * validated with `Number.isFinite()` before use.
 */
export class BrowseVendorsQueryDto {
  /** City slug to filter by, e.g. "seattle" */
  declare citySlug: string;
  /** Optional category filter */
  declare category?: string;
  /** Optional free-text search across businessName, searchTags, and descriptionMarkdown */
  declare q?: string;
  /** Pagination — arrive as strings from the query string; coerced in the service */
  declare page?: number | string;
  declare limit?: number | string;
  /**
   * Geo-proximity filter.
   * All three must be provided together for the filter to apply.
   * Arrive as strings from the query string; coerced to numbers in the service.
   */
  declare lat?: number | string;
  declare lng?: number | string;
  declare radiusKm?: number | string;
}
