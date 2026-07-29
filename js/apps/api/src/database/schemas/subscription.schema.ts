import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type SubscriptionDocument = Subscription & Document;

@Schema({ collection: "subscriptions", timestamps: true })
export class Subscription {
  /** References users._id */
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true })
  declare userId: Types.ObjectId;

  /** References subscription_plans.planId */
  @Prop({ required: true })
  declare planId: string;

  @Prop({
    required: true,
    enum: ["active", "cancelled", "past_due", "trialing"],
    default: "active",
  })
  declare status: string;

  /** When the current billing period ends; null for the free plan */
  @Prop({ default: null })
  declare currentPeriodEnd: Date | null;

  /** "stripe" | "razorpay" | null (free plan) */
  @Prop({ default: null })
  declare paymentProvider: string | null;

  /** ID of the subscription object in the payment provider's system */
  @Prop({ default: null })
  declare externalSubscriptionId: string | null;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
