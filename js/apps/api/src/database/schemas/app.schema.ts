import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type AppDocument = App & Document;

/**
 * A MetroHub micro-app in the shell catalog. This is the presentational
 * registry — titles, categories, icons, ordering — surfaced by
 * `GET /api/home/apps` and rendered by the shell launcher & workspace. The
 * shell binds each `appId` to its bundled React component; everything else
 * (what an admin might edit) lives here in Mongo.
 */
@Schema({ collection: "apps", timestamps: true })
export class App {
  /** Stable slug the shell binds to a component, e.g. "rummy-scorecard". */
  @Prop({ required: true, unique: true, index: true })
  declare appId: string;

  @Prop({ required: true })
  declare packageName: string;

  @Prop({ required: true })
  declare folder: string;

  @Prop({ required: true })
  declare displayName: string;

  @Prop({ required: true })
  declare category: string;

  @Prop({ required: true })
  declare route: string;

  /** Emoji shown in the launcher/tiles. */
  @Prop({ required: true, default: "" })
  declare icon: string;

  @Prop({ required: true, default: "" })
  declare tileTitle: string;

  @Prop({ required: true, default: "" })
  declare tileDescription: string;

  /** Sort position in the catalog (ascending). */
  @Prop({ required: true, default: 0, index: true })
  declare order: number;

  @Prop({ required: true, default: true, index: true })
  declare active: boolean;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const AppSchema = SchemaFactory.createForClass(App);
