export type RsvpStatus = "going" | "maybe" | "no";

/** Summary counts for an event's RSVPs. headcount = going responders + their guests. */
export interface RsvpSummary {
  going: number;
  maybe: number;
  no: number;
  headcount: number;
}

/** A guest's RSVP as shown on the public event page. */
export interface Guest {
  name: string;
  status: RsvpStatus;
  guests: number;
  note: string;
}

/** Compact event card (host dashboard + public page header). */
export interface EventCard {
  eventId: string;
  title: string;
  emoji: string;
  startAt: string;
  location: string;
  kind: string;
  going: number;
  headcount: number;
}

/** Full public event page payload. */
export interface EventDetail extends EventCard {
  description: string;
  hostName: string;
  guests: Guest[];
  summary: RsvpSummary;
}

export interface CreateEventInput {
  title: string;
  emoji: string;
  startAt: string;
  location: string;
  description: string;
}

export interface RsvpInput {
  name: string;
  status: RsvpStatus;
  guests: number;
  note: string;
}
