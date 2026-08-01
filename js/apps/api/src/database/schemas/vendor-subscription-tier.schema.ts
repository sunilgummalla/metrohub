import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type VendorSubscriptionTierDocument = VendorSubscriptionTier & Document;

/**
 * Defines the feature set available to a vendor at a given subscription tier.
 * At launch only the "free" tier is active; paid tiers will be added later.
 */
@Schema({ collection: "vendor_subscription_tiers", timestamps: true })
export class VendorSubscriptionTier {
  /** Unique slug, e.g. "free" | "pro" | "enterprise" */
  @Prop({ required: true, unique: true })
  declare slug: string;

  /** Display name, e.g. "Free", "Pro", "Enterprise" */
  @Prop({ required: true })
  declare name: string;

  /** Monthly price in smallest currency unit (0 for free tier) */
  @Prop({ required: true, default: 0 })
  declare monthlyPrice: number;

  @Prop({ required: true, default: "USD" })
  declare currency: string;

  // ─── Feature Flags ────────────────────────────────────────────────────────

  /** Maximum number of images allowed on the vendor profile */
  @Prop({ required: true, default: 5 })
  declare maxImages: number;

  /** Whether the vendor can post deals */
  @Prop({ type: Boolean, default: true })
  declare canPostDeals: boolean;

  /** Maximum number of active deals at once (null = unlimited) */
  @Prop({ type: Number, default: 3 })
  declare maxActiveDeals: number | null;

  /** Whether the vendor can post events */
  @Prop({ type: Boolean, default: true })
  declare canPostEvents: boolean;

  /** Maximum number of active events at once (null = unlimited) */
  @Prop({ type: Number, default: 2 })
  declare maxActiveEvents: number | null;

  // ─── Booster Allowances ───────────────────────────────────────────────────

  /**
   * Monthly free booster allowances included in this tier.
   * e.g. [{ type: "featured_category", count: 1 }]
   */
  @Prop({
    type: [{ type: { type: String }, count: Number }],
    default: [],
  })
  declare freeBoosterAllowances: Array<{ type: string; count: number }>;

  /** Whether this tier is currently available for new signups */
  @Prop({ type: Boolean, default: true })
  declare isActive: boolean;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const VendorSubscriptionTierSchema = SchemaFactory.createForClass(VendorSubscriptionTier);
