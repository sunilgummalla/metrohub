import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type GameSessionDocument = GameSession & Document;

@Schema({ collection: "game_sessions", timestamps: true })
export class GameSession {
  /** UUID v4 — internal SSE channel key and primary lookup key */
  @Prop({ required: true, unique: true, index: true })
  declare gameId: string;

  /**
   * Human-readable join code: adjective-noun-NN (lowercase).
   * e.g. "disco-panda-42"
   */
  @Prop({ required: true, unique: true, index: true })
  declare joinCode: string;

  @Prop({ required: true, enum: ["tambola", "bingo", "rummy"] })
  declare gameType: string;

  /** Full app-specific game state (calledNumbers, rounds, etc.) */
  @Prop({ type: Object, required: true })
  declare payload: Record<string, unknown>;

  @Prop({ required: true, enum: ["active", "ended"], default: "active" })
  declare status: string;

  /**
   * TTL field — MongoDB auto-deletes the document 24 hours after this
   * timestamp. Updated on every publish() call so the TTL resets on activity.
   */
  @Prop({ required: true, default: () => new Date() })
  declare expiresAt: Date;

  // Populated by @Schema timestamps: true
  declare createdAt: Date;
  declare updatedAt: Date;
}

export const GameSessionSchema = SchemaFactory.createForClass(GameSession);

// TTL index: auto-delete 24 hours after expiresAt
GameSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });
