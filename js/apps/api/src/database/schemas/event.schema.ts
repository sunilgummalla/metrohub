import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type EventDocument = Event & Document;

/**
 * A personal event a host creates and shares via a link. Anyone with the link
 * can RSVP (no login) — see the EventRsvp collection. Community events (ticket
 * modes, sponsorships, vendor stalls) will extend this shape later.
 */
@Schema({ collection: "events", timestamps: true })
export class Event {
  /** Public, URL-safe id used in the shareable link (e.g. "spring-potluck-7f3a"). */
  @Prop({ required: true, unique: true, index: true })
  declare eventId: string;

  /** The host (references users._id). */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  declare hostId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  declare title: string;

  // description/location are optional free text — default "" rather than required,
  // since Mongoose's `required` validator rejects an empty string.
  @Prop({ default: "" })
  declare description: string;

  @Prop({ required: true, default: "🎉" })
  declare emoji: string;

  /** When the event starts. */
  @Prop({ type: Date, required: true })
  declare startAt: Date;

  @Prop({ default: "" })
  declare location: string;

  /** "personal" for now; "community" arrives with the community-events feature. */
  @Prop({ required: true, enum: ["personal", "community"], default: "personal" })
  declare kind: string;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);
