import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type SplitDocument = Split & Document;

/**
 * A shared-cost line on the member's "Splits" dashboard. `amountMinor` is signed
 * from the viewer's perspective: positive = the counterparty owes the viewer,
 * negative = the viewer owes the counterparty.
 */
@Schema({ collection: "splits", timestamps: true })
export class Split {
  /** References users._id — the viewer this split belongs to */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  declare userId: Types.ObjectId;

  /** Who the split is with (display name) */
  @Prop({ required: true, trim: true })
  declare counterparty: string;

  /** What it's for, e.g. "Rummy · Friday table" or "Takeout" */
  @Prop({ required: true, default: "" })
  declare context: string;

  /** Signed minor units: + they owe you, - you owe them */
  @Prop({ required: true, default: 0 })
  declare amountMinor: number;

  @Prop({ required: true, default: "USD" })
  declare currency: string;

  @Prop({ required: true, enum: ["open", "settled"], default: "open", index: true })
  declare status: string;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const SplitSchema = SchemaFactory.createForClass(Split);
