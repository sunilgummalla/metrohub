import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type VendorDocument = Vendor & Document;

export type VendorStatus = "pending" | "approved" | "rejected" | "suspended";

/** Embedded geo-point for MongoDB 2dsphere index */
class GeoPoint {
  @Prop({ type: String, enum: ["Point"], required: true, default: "Point" })
  declare type: "Point";

  /** [longitude, latitude] */
  @Prop({ type: [Number], required: true })
  declare coordinates: [number, number];
}

/** Embedded contact information */
class VendorContact {
  @Prop({ type: String, default: null })
  declare phone: string | null;

  @Prop({ type: String, default: null })
  declare email: string | null;

  @Prop({ type: String, default: null })
  declare website: string | null;
}

/** An active booster on a vendor listing */
class ActiveBooster {
  /** Booster type key, e.g. "featured_category" | "promoted_search" */
  @Prop({ required: true })
  declare type: string;

  @Prop({ required: true })
  declare expiresAt: Date;
}

@Schema({ collection: "vendors", timestamps: true })
export class Vendor {
  /** References users._id — the vendor account owner */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  declare ownerId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ["pending", "approved", "rejected", "suspended"],
    default: "pending",
    index: true,
  })
  declare status: VendorStatus;

  // ─── Basic Info ───────────────────────────────────────────────────────────

  @Prop({ required: true, trim: true })
  declare businessName: string;

  /**
   * Top-level category slug, e.g. "restaurant", "home-service",
   * "photographer", "day-care".
   */
  @Prop({ required: true, index: true })
  declare category: string;

  /**
   * Dynamic, category-specific fields stored as a flexible JSON object.
   * Examples: { cuisineType: "Indian", menuUrl: "…" } for a restaurant,
   * { emergencyService: true, licenseNumber: "…" } for a plumber.
   */
  @Prop({ type: Object, default: {} })
  declare categoryData: Record<string, unknown>;

  // ─── Rich Content ─────────────────────────────────────────────────────────

  /** Vendor-authored description in Markdown format */
  @Prop({ type: String, default: "" })
  declare descriptionMarkdown: string;

  /** S3 / Cloudflare R2 image URLs */
  @Prop({ type: [String], default: [] })
  declare images: string[];

  /** User-defined search tags for AI/semantic search */
  @Prop({ type: [String], default: [], index: true })
  declare searchTags: string[];

  // ─── Geo & Contact ────────────────────────────────────────────────────────

  /** City slug used for multi-city routing, e.g. "seattle" */
  @Prop({ required: true, index: true })
  declare citySlug: string;

  @Prop({ type: GeoPoint, required: false, default: null })
  declare location: GeoPoint | null;

  @Prop({ type: String, default: "" })
  declare address: string;

  @Prop({ type: VendorContact, default: () => ({}) })
  declare contact: VendorContact;

  // ─── Monetization ─────────────────────────────────────────────────────────

  /**
   * Whether this vendor is currently featured (shown with a gold badge and
   * boosted in browse results). Managed via a dedicated admin endpoint
   * (to be added in a future phase).
   */
  @Prop({ type: Boolean, default: false, index: true })
  declare featured: boolean;

  /** References vendor_subscription_tiers._id */
  @Prop({ type: Types.ObjectId, default: null })
  declare subscriptionTierId: Types.ObjectId | null;

  @Prop({ type: [ActiveBooster], default: [] })
  declare activeBoosters: ActiveBooster[];

  // ─── AI / Vector ──────────────────────────────────────────────────────────

  /** External vector-store document ID (e.g. Qdrant point ID) */
  @Prop({ type: String, default: null })
  declare vectorEmbeddingId: string | null;

  @Prop({ type: Date, default: null })
  declare lastTokenizedAt: Date | null;

  // ─── Timestamps (injected by Mongoose) ────────────────────────────────────
  declare createdAt: Date;
  declare updatedAt: Date;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);

// 2dsphere index for geo-queries
VendorSchema.index({ location: "2dsphere" });

// Compound index for the most common browse query: city + category + status
VendorSchema.index({ citySlug: 1, category: 1, status: 1 });

// Full-text search index — used by $text queries in the search endpoint
// Weights: businessName most relevant, then searchTags, then description
VendorSchema.index(
  { businessName: "text", searchTags: "text", descriptionMarkdown: "text" },
  { weights: { businessName: 10, searchTags: 5, descriptionMarkdown: 1 }, name: "vendor_text_search" },
);
