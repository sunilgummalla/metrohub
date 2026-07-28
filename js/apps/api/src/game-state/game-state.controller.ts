import {
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
import { map, Observable } from "rxjs";
import { GameEntry, GameStateService } from "./game-state.service";

interface SseMessageEvent {
  data: string;
}

@Controller("game")
export class GameStateController {
  constructor(private readonly gameStateService: GameStateService) {}

  /**
   * Host pushes a new state snapshot.
   * POST /api/game/:id
   *
   * Body is arbitrary JSON — the only reserved field is `gameType`.
   * Everything else is stored as-is and forwarded to viewers.
   */
  @Post(":id")
  @HttpCode(200)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publish(@Param("id") gameId: string, @Body() body: Record<string, any>): GameEntry {
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
   * @Sse sets Content-Type: text/event-stream automatically.
   */
  @Sse(":id/stream")
  stream(
    @Param("id") gameId: string,
    @Res({ passthrough: true }) res: Response
  ): Observable<SseMessageEvent> {
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering

    const subject = this.gameStateService.getStream(gameId);
    return subject.pipe(
      map((entry: GameEntry): SseMessageEvent => ({
        data: JSON.stringify(entry),
      }))
    );
  }
}
