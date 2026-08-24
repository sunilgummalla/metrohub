import { Body, Controller, ForbiddenException, Get, HttpCode, Param, Post, Req, UnauthorizedException } from "@nestjs/common";
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
  create(@Req() req: ReqLike, @Body() body: unknown) {
    return this.events.create(hostId(req), asObject(body));
  }

  @Get()
  listMine(@Req() req: ReqLike) {
    return this.events.listMine(hostId(req));
  }

  @Get(":eventId")
  getOne(@Param("eventId") eventId: string) {
    return this.events.getPublic(eventId);
  }

  @Post(":eventId/rsvp")
  @HttpCode(200)
  rsvp(@Param("eventId") eventId: string, @Body() body: unknown) {
    return this.events.rsvp(eventId, asObject(body));
  }
}

type ReqLike = { headers: Record<string, string | string[] | undefined> };

/** Coerce a JSON body to a plain object so a non-object payload can't slip through. */
function asObject(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

/**
 * Resolve the host id from the Bearer stub token.
 *
 * Stub auth is a placeholder pending real OAuth, so — like Home's
 * demo-login/dashboard — it is only trusted where the demo persona is seeded
 * (SEED_SAMPLE_DATA=true). In any other environment a forged `stub-token-<id>`
 * must not be able to create or list events, so we default-deny with a 403.
 */
function hostId(req: ReqLike): string {
  if (process.env["SEED_SAMPLE_DATA"] !== "true") {
    throw new ForbiddenException("Event management is not available in this environment.");
  }
  const id = parseStubBearerToken(req.headers["authorization"] ?? req.headers["Authorization"]);
  if (!id) throw new UnauthorizedException("Sign in to manage events");
  return id;
}
