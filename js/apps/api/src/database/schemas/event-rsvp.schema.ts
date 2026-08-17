import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type EventRsvpDocument = EventRsvp & Document;

/**
 * A guest's RSVP to an event. Link-based (no login): a guest is identified by a
 * normalized name, so re-submitting updates their existing RSVP. Unique per
 * (eventId, nameKey).
 */
@Schema({ collection: "event_rsvps", timestamps: true })
export class EventRsvp {
  /** References events.eventId (the public id). */
  @Prop({ required: true, index: true })
  declare eventId: string;

  /** Lowercased/trimmed name — the dedupe key within an event. */
  @Prop({ required: true })
  declare nameKey: string;

  /** Display name as the guest entered it. */
  @Prop({ required: true, trim: true })
  declare name: string;

  @Prop({ required: true, enum: ["going", "maybe", "no"], default: "going" })
  declare status: string;

  /** Additional guests beyond the responder (party size = 1 + guests). */
  @Prop({ required: true, default: 0, min: 0 })
  declare guests: number;

  // Optional free text — default "" rather than required (an empty string would
  // fail Mongoose's `required` validator).
  @Prop({ default: "" })
  declare note: string;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const EventRsvpSchema = SchemaFactory.createForClass(EventRsvp);
// One RSVP per guest name per event (re-submitting updates it).
EventRsvpSchema.index({ eventId: 1, nameKey: 1 }, { unique: true });
