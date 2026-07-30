import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type BoosterConfigDocument = BoosterConfig & Document;

export type BoosterPeriod = "daily" | "weekly" | "bi-weekly" | "monthly";

@Schema({ collection: "booster_configs", timestamps: true })
export class BoosterConfig {
  /** Human-readable name, e.g. "Weekly Featured Placement" */
  @Prop({ required: true, trim: true })
  declare name: string;

  /**
   * Machine-readable type key used to apply the booster effect.
   * e.g. "featured_category" | "promoted_search"
   */
  @Prop({ required: true, unique: true })
  declare type: string;

  /** Short description shown to the vendor when purchasing */
  @Prop({ type: String, default: "" })
  declare description: string;

  /** How long the booster stays active once activated, in milliseconds */
  @Prop({ required: true })
  declare durationMs: number;

  /**
   * Number of activations included in one purchase.
   * e.g. 3 means the vendor can activate this booster 3 times.
   */
  @Prop({ required: true, default: 1 })
  declare count: number;

  /**
   * The period within which the count resets (if applicable).
   * e.g. "weekly" means 3 activations per week.
   */
  @Prop({
    type: String,
    enum: ["daily", "weekly", "bi-weekly", "monthly"],
    default: null,
  })
  declare period: BoosterPeriod | null;

  /** Price in the smallest currency unit (e.g. cents for USD) */
  @Prop({ required: true, default: 0 })
  declare price: number;

  @Prop({ required: true, default: "USD" })
  declare currency: string;

  /** Whether this booster is currently available for purchase */
  @Prop({ type: Boolean, default: true })
  declare isActive: boolean;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const BoosterConfigSchema = SchemaFactory.createForClass(BoosterConfig);
