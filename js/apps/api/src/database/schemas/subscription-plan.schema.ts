import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type SubscriptionPlanDocument = SubscriptionPlan & Document;

/**
 * Prices stored as a map of ISO 4217 currency code → amount in minor units.
 * e.g. { INR: 9900, USD: 199, CAD: 249 }
 * New currencies are added as new keys — no schema migration needed.
 */
class PriceMap {
  @Prop({ default: 0 })
  declare INR: number;

  @Prop({ default: 0 })
  declare USD: number;

  @Prop({ default: 0 })
  declare CAD: number;
}

@Schema({ collection: "subscription_plans", timestamps: true })
export class SubscriptionPlan {
  /** Stable identifier used in code: "free" | "pro_monthly" | "family_monthly" */
  @Prop({ required: true, unique: true, index: true })
  declare planId: string;

  @Prop({ required: true })
  declare name: string;

  /** 0 = forever (free), 30 = monthly, 365 = annual */
  @Prop({ required: true, default: 0 })
  declare intervalDays: number;

  @Prop({ type: PriceMap, required: true, default: () => ({}) })
  declare prices: PriceMap;

  /** Human-readable feature list shown on the pricing page */
  @Prop({ type: [String], default: [] })
  declare features: string[];

  @Prop({ required: true, default: true })
  declare isActive: boolean;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const SubscriptionPlanSchema =
  SchemaFactory.createForClass(SubscriptionPlan);
