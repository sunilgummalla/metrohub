import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type UserDocument = User & Document;

/** OAuth provider link */
class OAuthProvider {
  @Prop({ required: true })
  declare provider: string; // "google" | "entra"

  @Prop({ required: true })
  declare providerId: string;
}

@Schema({ collection: "users", timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true, lowercase: true })
  declare email: string;

  @Prop({ required: true })
  declare displayName: string;

  /**
   * Handle shown in games when the user is logged in.
   * Defaults to the first part of the email address.
   */
  @Prop({ required: true })
  declare defaultHandle: string;

  /** Null for OAuth-only accounts */
  @Prop({ type: String, default: null, select: false })
  declare passwordHash: string | null;

  @Prop({ type: [OAuthProvider], default: [] })
  declare oauthProviders: OAuthProvider[];

  /** References subscriptions._id */
  @Prop({ type: Types.ObjectId, default: null })
  declare subscriptionId: Types.ObjectId | null;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
