import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type GameArchiveDocument = GameArchive & Document;

@Schema({ collection: "game_archives", timestamps: true })
export class GameArchive {
  /** Matches game_sessions.gameId */
  @Prop({ required: true, unique: true, index: true })
  declare gameId: string;

  @Prop({ required: true })
  declare joinCode: string;

  @Prop({ required: true, enum: ["tambola", "bingo", "rummy"] })
  declare gameType: string;

  /** Full game state at the time the game ended */
  @Prop({ type: Object, required: true })
  declare finalPayload: Record<string, unknown>;

  /** ObjectId of the host participant */
  @Prop({ type: Types.ObjectId, default: null })
  declare hostUserId: Types.ObjectId | null;

  /** For Rummy: player display names */
  @Prop({ type: [String], default: [] })
  declare players: string[];

  /** Display name of the winner (if applicable) */
  @Prop({ default: null })
  declare winner: string | null;

  @Prop({ required: true })
  declare startedAt: Date;

  @Prop({ required: true, default: () => new Date() })
  declare endedAt: Date;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const GameArchiveSchema = SchemaFactory.createForClass(GameArchive);
