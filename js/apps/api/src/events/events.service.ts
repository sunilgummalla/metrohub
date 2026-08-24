import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { randomBytes } from "crypto";
import {
  Event, EventDocument,
  EventRsvp, EventRsvpDocument,
  User, UserDocument,
} from "../database";

interface CreateEventDto {
  title?: unknown;
  description?: unknown;
  emoji?: unknown;
  startAt?: unknown;
  location?: unknown;
}
interface RsvpDto {
  name?: unknown;
  status?: unknown;
  guests?: unknown;
  note?: unknown;
}

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v.trim() : fallback);
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "event";

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @InjectModel(EventRsvp.name) private readonly rsvpModel: Model<EventRsvpDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  private async uniqueEventId(title: string): Promise<string> {
    const base = slugify(title);
    for (let i = 0; i < 6; i++) {
      const id = `${base}-${randomBytes(2).toString("hex")}`;
      if (!(await this.eventModel.exists({ eventId: id }))) return id;
    }
    return `${base}-${randomBytes(4).toString("hex")}`;
  }

  async create(hostId: string, dto: CreateEventDto) {
    const title = str(dto.title);
    if (!title) throw new BadRequestException("Title is required");
    const startAt = new Date(str(dto.startAt));
    if (Number.isNaN(startAt.getTime())) throw new BadRequestException("A valid start date/time is required");
    const base = {
      hostId: new Types.ObjectId(hostId),
      title,
      description: str(dto.description),
      emoji: str(dto.emoji) || "🎉",
      startAt,
      location: str(dto.location),
      kind: "personal",
    };
    // Retry the insert on E11000 (duplicate eventId): uniqueEventId() checks then
    // inserts, so two concurrent creates can still collide. A fresh id per attempt
    // resolves the rare race instead of surfacing a 500.
    const MAX_ATTEMPTS = 5;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const eventId = await this.uniqueEventId(title);
      try {
        const doc = await this.eventModel.create({ eventId, ...base });
        return this.card(doc.toObject(), { going: 0, maybe: 0, no: 0, headcount: 0 });
      } catch (err: unknown) {
        if ((err as { code?: number })?.code === 11000 && attempt < MAX_ATTEMPTS - 1) continue;
        throw err;
      }
    }
    throw new Error("Failed to create event after retries");
  }

  async listMine(hostId: string) {
    const events = await this.eventModel.find({ hostId: new Types.ObjectId(hostId) }).sort({ startAt: 1 }).lean();
    const byEvent = await this.countsByEvent(events.map((e) => e.eventId));
    return { events: events.map((e) => this.card(e, byEvent[e.eventId] ?? { going: 0, maybe: 0, no: 0, headcount: 0 })) };
  }

  async getPublic(eventId: string) {
    const e = await this.eventModel.findOne({ eventId }).lean();
    if (!e) throw new NotFoundException("Event not found");
    const host = await this.userModel.findById(e.hostId, { displayName: 1 }).lean();
    const rsvps = await this.rsvpModel.find({ eventId }).sort({ createdAt: 1 }).lean();
    const summary = this.summarize(rsvps);
    return {
      ...this.card(e, summary),
      description: e.description,
      hostName: host?.displayName ?? "Host",
      guests: rsvps.map((r) => ({ name: r.name, status: r.status, guests: r.guests, note: r.note })),
      summary,
    };
  }

  async rsvp(eventId: string, dto: RsvpDto) {
    if (!(await this.eventModel.exists({ eventId }))) throw new NotFoundException("Event not found");
    const name = str(dto.name);
    if (!name) throw new BadRequestException("Your name is required");
    const status = ["going", "maybe", "no"].includes(dto.status as string) ? (dto.status as string) : "going";
    const guests = Math.max(0, Math.min(20, Math.round(Number(dto.guests)) || 0));
    const filter = { eventId, nameKey: name.toLowerCase() };
    const update = { $set: { name, status, guests, note: str(dto.note) } };
    try {
      await this.rsvpModel.updateOne(filter, update, { upsert: true });
    } catch (err: unknown) {
      // Concurrent upserts against the unique (eventId, nameKey) index can race
      // to E11000 (e.g. a double-submit). The RSVP is idempotent, so on a
      // duplicate-key the row now exists — retry once as a plain update.
      if ((err as { code?: number })?.code === 11000) {
        await this.rsvpModel.updateOne(filter, update);
      } else {
        throw err;
      }
    }
    return this.getPublic(eventId);
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private summarize(rsvps: Array<{ status: string; guests: number }>) {
    const s = { going: 0, maybe: 0, no: 0, headcount: 0 };
    for (const r of rsvps) {
      if (r.status === "going") { s.going++; s.headcount += 1 + (r.guests || 0); }
      else if (r.status === "maybe") s.maybe++;
      else if (r.status === "no") s.no++;
    }
    return s;
  }

  private async countsByEvent(eventIds: string[]) {
    if (!eventIds.length) return {} as Record<string, { going: number; maybe: number; no: number; headcount: number }>;
    const rows = await this.rsvpModel.find({ eventId: { $in: eventIds } }, { eventId: 1, status: 1, guests: 1 }).lean();
    const out: Record<string, { going: number; maybe: number; no: number; headcount: number }> = {};
    for (const r of rows) {
      const s = (out[r.eventId] ??= { going: 0, maybe: 0, no: 0, headcount: 0 });
      if (r.status === "going") { s.going++; s.headcount += 1 + (r.guests || 0); }
      else if (r.status === "maybe") s.maybe++;
      else if (r.status === "no") s.no++;
    }
    return out;
  }

  private card(
    e: { eventId: string; title: string; emoji: string; startAt: Date; location: string; kind: string },
    summary: { going: number; maybe: number; no: number; headcount: number },
  ) {
    return {
      eventId: e.eventId,
      title: e.title,
      emoji: e.emoji,
      startAt: e.startAt,
      location: e.location,
      kind: e.kind,
      going: summary.going,
      headcount: summary.headcount,
    };
  }
}
