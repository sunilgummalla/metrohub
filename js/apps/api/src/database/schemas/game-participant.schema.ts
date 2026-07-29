import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type GameParticipantDocument = GameParticipant & Document;

@Schema({ collection: "game_participants", timestamps: true })
export class GameParticipant {
  /** References game_sessions.gameId */
  @Prop({ required: true, index: true })
  declare gameId: string;

  /** Null for guest participants */
  @Prop({ type: Types.ObjectId, default: null })
  declare userId: Types.ObjectId | null;

  /**
   * Display name in the game.
   * - Logged-in user: their chosen handle (e.g. "SunilG")
   * - Guest: PascalCase generated handle (e.g. "DiscoPanda42")
   */
  @Prop({ required: true })
  declare handle: string;

  @Prop({ required: true, enum: ["host", "player"], default: "player" })
  declare role: string;

  @Prop({ required: true, default: true })
  declare isGuest: boolean;

  @Prop({ required: true, default: () => new Date() })
  declare joinedAt: Date;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const GameParticipantSchema =
  SchemaFactory.createForClass(GameParticipant);

// Prevent a logged-in user from joining the same game twice
GameParticipantSchema.index(
  { userId: 1, gameId: 1 },
  { unique: true, sparse: true },
);
