import { Body, Controller, Get, HttpCode, Param, Post, Req, UnauthorizedException } from "@nestjs/common";
import { EventsService } from "./events.service";
import { parseStubBearerToken } from "../common/stub-auth";

/**
 * Events API — personal event planning.
 *   POST /api/events                -> create an event (host, Bearer stub token)
 *   GET  /api/events                -> list the host's events (Bearer stub token)
 *   GET  /api/events/:eventId       -> public event page + RSVP summary + guests
 *   POST /api/events/:eventId/rsvp  -> submit/update an RSVP (public, link-based)
 *
 * Creating/listing needs the host's session token; viewing and RSVP are public
 * so anyone with the link can respond without logging in.
 */
@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  @HttpCode(201)
  create(@Req() req: Req, @Body() body: unknown) {
    return this.events.create(hostId(req), body ?? {});
  }

  @Get()
  listMine(@Req() req: Req) {
    return this.events.listMine(hostId(req));
  }

  @Get(":eventId")
  getOne(@Param("eventId") eventId: string) {
    return this.events.getPublic(eventId);
  }

  @Post(":eventId/rsvp")
  @HttpCode(200)
  rsvp(@Param("eventId") eventId: string, @Body() body: unknown) {
    return this.events.rsvp(eventId, body ?? {});
  }
}

type Req = { headers: Record<string, string | string[] | undefined> };

/** Resolve the host id from the Bearer stub token, or 401. */
function hostId(req: Req): string {
  const id = parseStubBearerToken(req.headers["authorization"] ?? req.headers["Authorization"]);
  if (!id) throw new UnauthorizedException("Sign in to manage events");
  return id;
}
