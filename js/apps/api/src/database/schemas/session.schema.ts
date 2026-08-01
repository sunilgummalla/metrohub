import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type SessionDocument = Session & Document;

@Schema({ collection: "sessions", timestamps: true })
export class Session {
  /** References users._id */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  declare userId: Types.ObjectId;

  /** Opaque refresh token — hashed before storage */
  @Prop({ required: true, unique: true, select: false })
  declare tokenHash: string;

  /** User-agent string for display in "active sessions" UI */
  @Prop({ type: String, default: null })
  declare userAgent: string | null;

  /** IP address at login time */
  @Prop({ type: String, default: null })
  declare ipAddress: string | null;

  /** TTL field — auto-deleted after 30 days of inactivity */
  @Prop({ required: true, default: () => new Date() })
  declare expiresAt: Date;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// TTL index: auto-delete 30 days after expiresAt
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 2592000 });
