import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type DealDocument = Deal & Document;

/**
 * A time-boxed offer / highlight posted by a vendor, surfaced on the storefront
 * landing ("Featured this week") and the console ("deals near you").
 */
@Schema({ collection: "deals", timestamps: true })
export class Deal {
  /** References vendors._id */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  declare vendorId: Types.ObjectId;

  @Prop({ required: true, index: true })
  declare citySlug: string;

  @Prop({ required: true, trim: true })
  declare title: string;

  @Prop({ required: true, default: "" })
  declare blurb: string;

  @Prop({ required: true, enum: ["deal", "new", "featured", "event"], default: "deal" })
  declare kind: string;

  /** When the offer ends; null = ongoing */
  @Prop({ type: Date, default: null })
  declare expiresAt: Date | null;

  @Prop({ required: true, default: true, index: true })
  declare active: boolean;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const DealSchema = SchemaFactory.createForClass(Deal);
