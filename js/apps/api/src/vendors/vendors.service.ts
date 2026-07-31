import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Vendor, VendorDocument, VendorStatus } from "../database";
import { BrowseVendorsQueryDto, CreateVendorDto, UpdateVendorDto } from "./vendors.dto";

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

/** Validate and convert a string to a Mongoose ObjectId, throwing 400 on invalid input. */
function toObjectId(id: string, label = "id"): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException(`Invalid ${label}: "${id}"`);
  }
  return new Types.ObjectId(id);
}

/**
 * Coerce a query-string value to a finite number.
 * Returns `undefined` when the value is absent or not a finite number.
 * This is necessary because NestJS does not apply `transform: true` globally,
 * so all query params arrive as strings.
 */
function toFiniteNumber(value: number | string | undefined): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Clamp `page` to a positive integer (minimum 1).
 * Prevents negative `skip` values which MongoDB rejects.
 */
function clampPage(raw: number | string | undefined): number {
  const n = toFiniteNumber(raw) ?? 1;
  return Math.max(1, Math.floor(n));
}

/**
 * Clamp `limit` to the range [1, MAX_PAGE_LIMIT].
 * Prevents zero/negative limits that produce unbounded or empty queries.
 */
function clampLimit(raw: number | string | undefined): number {
  const n = toFiniteNumber(raw) ?? DEFAULT_PAGE_LIMIT;
  return Math.min(Math.max(1, Math.floor(n)), MAX_PAGE_LIMIT);
}

@Injectable()
export class VendorsService {
  constructor(
    @InjectModel(Vendor.name)
    private readonly vendorModel: Model<VendorDocument>,
  ) {}

  // ─── Public Browse ────────────────────────────────────────────────────────

  /**
   * Returns a paginated list of approved vendors for a given city.
   * Supports optional category filter, text search, and geo-proximity.
   *
   * When a text query is provided, uses MongoDB $text search (backed by the
   * vendor_text_search index) for efficient, injection-safe full-text matching.
   *
   * Geo params (lat, lng, radiusKm) arrive as strings from the query string and
   * are coerced to finite numbers before use; the geo filter is silently skipped
   * when any value is missing or non-numeric.
   *
   * IMPORTANT: MongoDB does not allow `.sort()` when `$near` is used in the
   * filter — it implicitly sorts by distance. The sort is therefore only applied
   * for non-geo queries.
   */
  async browse(query: BrowseVendorsQueryDto): Promise<{ data: VendorDocument[]; total: number }> {
    const { citySlug, category, q } = query;

    // Clamp pagination params — page must be ≥ 1 (negative skip throws in Mongo),
    // limit must be in [1, MAX_PAGE_LIMIT].
    const page = clampPage(query.page);
    const limit = clampLimit(query.limit);
    const lat = toFiniteNumber(query.lat);
    const lng = toFiniteNumber(query.lng);
    const radiusKm = toFiniteNumber(query.radiusKm);
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      citySlug,
      status: "approved" as VendorStatus,
    };

    if (category) {
      filter.category = category;
    }

    if (q) {
      // Use $text search (backed by vendor_text_search index) — safe from regex injection
      filter.$text = { $search: q };
    }

    // Geo-proximity filter using MongoDB 2dsphere index.
    // Only applied when all three values are present and finite numbers.
    const isGeoQuery = lat !== undefined && lng !== undefined && radiusKm !== undefined;
    if (isGeoQuery) {
      filter.location = {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000, // convert km to metres
        },
      };
    }

    // MongoDB does NOT allow .sort() when $near is used — $near implicitly sorts
    // results by ascending distance. Only apply the explicit sort for non-geo queries.
    const baseQuery = this.vendorModel.find(filter).skip(skip).limit(limit).lean();
    const sortedQuery = isGeoQuery
      ? baseQuery // $near already sorts by distance; adding .sort() throws
      : baseQuery.sort({ "activeBoosters.0.expiresAt": -1, createdAt: -1 });

    const [data, total] = await Promise.all([
      sortedQuery.exec(),
      this.vendorModel.countDocuments(filter).exec(),
    ]);

    return { data: data as unknown as VendorDocument[], total };
  }

  /** Returns a single approved vendor by ID. Throws 400 for malformed IDs, 404 if not found. */
  async findOne(id: string): Promise<VendorDocument> {
    const oid = toObjectId(id);
    const vendor = await this.vendorModel
      .findOne({ _id: oid, status: "approved" })
      .lean()
      .exec();

    if (!vendor) {
      throw new NotFoundException(`Vendor ${id} not found`);
    }

    return vendor as unknown as VendorDocument;
  }

  /** Returns all distinct categories that have at least one approved vendor in a city */
  async getCategories(citySlug: string): Promise<string[]> {
    return this.vendorModel.distinct("category", { citySlug, status: "approved" }).exec();
  }

  // ─── Member (Vendor Self-Service) ─────────────────────────────────────────

  /** Creates a new vendor application (status: pending) */
  async create(ownerId: string, dto: CreateVendorDto): Promise<VendorDocument> {
    const vendor = new this.vendorModel({
      ownerId: toObjectId(ownerId, "ownerId"),
      status: "pending",
      businessName: dto.businessName,
      category: dto.category,
      citySlug: dto.citySlug,
      descriptionMarkdown: dto.descriptionMarkdown ?? "",
      address: dto.address ?? "",
      searchTags: dto.searchTags ?? [],
      categoryData: dto.categoryData ?? {},
      contact: dto.contact ?? {},
      location: dto.location
        ? {
            type: "Point",
            coordinates: [dto.location.longitude, dto.location.latitude],
          }
        : null,
    });

    return vendor.save();
  }

  /** Updates a vendor's own profile (only allowed fields) */
  async update(id: string, ownerId: string, dto: UpdateVendorDto): Promise<VendorDocument> {
    const update: Partial<Vendor> = {};

    if (dto.businessName !== undefined) update.businessName = dto.businessName;
    if (dto.category !== undefined) update.category = dto.category;
    if (dto.descriptionMarkdown !== undefined) update.descriptionMarkdown = dto.descriptionMarkdown;
    if (dto.address !== undefined) update.address = dto.address;
    if (dto.searchTags !== undefined) update.searchTags = dto.searchTags;
    if (dto.categoryData !== undefined) update.categoryData = dto.categoryData;
    if (dto.contact !== undefined) update.contact = dto.contact as Vendor["contact"];
    if (dto.images !== undefined) update.images = dto.images;
    if (dto.location !== undefined) {
      update.location = {
        type: "Point",
        coordinates: [dto.location.longitude, dto.location.latitude],
      };
    }

    // Mark as needing re-tokenization whenever content changes
    update.lastTokenizedAt = null;

    const vendor = await this.vendorModel
      .findOneAndUpdate(
        { _id: toObjectId(id), ownerId: toObjectId(ownerId, "ownerId") },
        { $set: update },
        { new: true },
      )
      .exec();

    if (!vendor) {
      throw new NotFoundException(`Vendor ${id} not found or not owned by this user`);
    }

    return vendor;
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  /** Returns all vendors (any status) for admin review */
  async adminList(
    status?: VendorStatus,
    page = 1,
    limit = DEFAULT_PAGE_LIMIT,
  ): Promise<{ data: VendorDocument[]; total: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = status ? { status } : {};
    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.min(Math.max(1, Math.floor(limit)), MAX_PAGE_LIMIT);
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      this.vendorModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean()
        .exec(),
      this.vendorModel.countDocuments(filter).exec(),
    ]);

    return { data: data as unknown as VendorDocument[], total };
  }

  /** Approves or rejects a vendor application */
  async setStatus(id: string, status: VendorStatus): Promise<VendorDocument> {
    const vendor = await this.vendorModel
      .findByIdAndUpdate(
        toObjectId(id),
        { $set: { status } },
        { new: true },
      )
      .exec();

    if (!vendor) {
      throw new NotFoundException(`Vendor ${id} not found`);
    }

    return vendor;
  }
}
