import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type AccountDocument = Account & Document;

/**
 * A money account shown on the member's "My Accounts" dashboard. Balances are
 * stored in minor units (e.g. cents) to avoid floating-point drift.
 */
@Schema({ collection: "accounts", timestamps: true })
export class Account {
  /** References users._id — the account owner */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  declare userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  declare name: string;

  @Prop({ required: true, enum: ["checking", "savings", "cash", "card"], default: "checking" })
  declare kind: string;

  /** Current balance in minor units (cents). May be negative for card/credit. */
  @Prop({ required: true, default: 0 })
  declare balanceMinor: number;

  @Prop({ required: true, default: "USD" })
  declare currency: string;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
