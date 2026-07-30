import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Vendor, VendorDocument, VendorStatus } from "../database";
import { BrowseVendorsQueryDto, CreateVendorDto, UpdateVendorDto } from "./vendors.dto";

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

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
   */
  async browse(query: BrowseVendorsQueryDto): Promise<{ data: VendorDocument[]; total: number }> {
    const { citySlug, category, q, page = 1, radiusKm, lat, lng } = query;
    const limit = Math.min(query.limit ?? DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
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
      // Simple text search across business name and search tags
      filter.$or = [
        { businessName: { $regex: q, $options: "i" } },
        { searchTags: { $regex: q, $options: "i" } },
      ];
    }

    // Geo-proximity filter using MongoDB 2dsphere index
    if (lat !== undefined && lng !== undefined && radiusKm !== undefined) {
      filter.location = {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000, // convert km to metres
        },
      };
    }

    const [data, total] = await Promise.all([
      this.vendorModel
        .find(filter)
        .sort({ "activeBoosters.0.expiresAt": -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.vendorModel.countDocuments(filter).exec(),
    ]);

    return { data: data as unknown as VendorDocument[], total };
  }

  /** Returns a single approved vendor by ID */
  async findOne(id: string): Promise<VendorDocument> {
    const vendor = await this.vendorModel
      .findOne({ _id: new Types.ObjectId(id), status: "approved" })
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
      ownerId: new Types.ObjectId(ownerId),
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
        { _id: new Types.ObjectId(id), ownerId: new Types.ObjectId(ownerId) },
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
    const skip = (page - 1) * Math.min(limit, MAX_PAGE_LIMIT);

    const [data, total] = await Promise.all([
      this.vendorModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(limit, MAX_PAGE_LIMIT))
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
        new Types.ObjectId(id),
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
