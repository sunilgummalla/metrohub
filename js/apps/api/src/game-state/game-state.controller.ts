import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Res,
  Sse,
} from "@nestjs/common";
import { Response } from "express";
import { interval, merge, Observable, Subject } from "rxjs";
import { map, takeUntil } from "rxjs/operators";
import { GameEntry, GameStateService } from "./game-state.service";

interface SseMessageEvent {
  data: string;
}

/** Loose UUID v4 pattern — rejects obviously invalid game IDs */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Maximum serialised payload size accepted from the host (64 KB) */
const MAX_PAYLOAD_BYTES = 64 * 1024;

@Controller("game")
export class GameStateController {
  constructor(private readonly gameStateService: GameStateService) {}

  /**
   * Host pushes a new state snapshot.
   * POST /api/game/:id
   *
   * Body is arbitrary JSON — the only reserved field is `gameType`.
   * Everything else is stored as-is and forwarded to viewers.
   *
   * Validation:
   *   - gameId must be a valid UUID v4
   *   - serialised body must not exceed MAX_PAYLOAD_BYTES
   */
  @Post(":id")
  @HttpCode(200)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publish(@Param("id") gameId: string, @Body() body: Record<string, any>): GameEntry {
    if (!UUID_RE.test(gameId)) {
      throw new BadRequestException("gameId must be a valid UUID v4");
    }
    const serialised = JSON.stringify(body);
    if (serialised.length > MAX_PAYLOAD_BYTES) {
      throw new BadRequestException(
        `Payload too large (${serialised.length} bytes; max ${MAX_PAYLOAD_BYTES})`
      );
    }
    return this.gameStateService.publish(gameId, body);
  }

  /**
   * Read-only viewer fetches the latest snapshot on first load.
   * GET /api/game/:id
   */
  @Get(":id")
  getLatest(@Param("id") gameId: string): GameEntry {
    const entry = this.gameStateService.getLatest(gameId);
    if (!entry) throw new NotFoundException(`Game ${gameId} not found or expired`);
    return entry;
  }

  /**
   * SSE stream — read-only viewer subscribes for live updates.
   * GET /api/game/:id/stream
   *
   * Sends a keepalive comment every 30 seconds to prevent proxy/load-balancer
   * timeouts and to let the client detect stale connections quickly.
   */
  @Sse(":id/stream")
  stream(
    @Param("id") gameId: string,
    @Res({ passthrough: true }) res: Response
  ): Observable<SseMessageEvent> {
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering for SSE

    const disconnect$ = new Subject<void>();
    res.on("close", () => disconnect$.next());

    const subject = this.gameStateService.getStream(gameId);

    // Real game-state events
    const events$ = subject.pipe(
      map((entry: GameEntry): SseMessageEvent => ({
        data: JSON.stringify(entry),
      }))
    );

    // 30-second keepalive comment (SSE comments start with `:`)
    const keepalive$ = interval(30_000).pipe(
      map((): SseMessageEvent => ({ data: ": keepalive" }))
    );

    return merge(events$, keepalive$).pipe(takeUntil(disconnect$));
  }
}
