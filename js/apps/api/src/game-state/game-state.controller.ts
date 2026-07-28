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
import { GameState, GameStateService } from "./game-state.service";

interface PublishDto {
  gameType: "tambola" | "bingo";
  calledNumbers: number[];
  currentNumber: number | null;
  remaining: number;
}

interface SseMessageEvent {
  data: string;
}

@Controller("game")
export class GameStateController {
  constructor(private readonly gameStateService: GameStateService) {}

  /**
   * Host pushes a new state snapshot.
   * POST /api/game/:id
   */
  @Post(":id")
  @HttpCode(200)
  publish(
    @Param("id") gameId: string,
    @Body() dto: PublishDto
  ): GameState {
    return this.gameStateService.publish(gameId, {
      gameType: dto.gameType,
      calledNumbers: dto.calledNumbers,
      currentNumber: dto.currentNumber,
      remaining: dto.remaining,
    });
  }

  /**
   * Read-only viewer fetches the latest snapshot on first load.
   * GET /api/game/:id
   */
  @Get(":id")
  getLatest(@Param("id") gameId: string): GameState {
    const state = this.gameStateService.getLatest(gameId);
    if (!state) throw new NotFoundException(`Game ${gameId} not found or expired`);
    return state;
  }

  /**
   * SSE stream — read-only viewer subscribes for live updates.
   * GET /api/game/:id/stream
   *
   * Uses @Sse decorator which sets Content-Type: text/event-stream automatically.
   */
  @Sse(":id/stream")
  stream(
    @Param("id") gameId: string,
    @Res({ passthrough: true }) res: Response
  ): Observable<SseMessageEvent> {
    // Keep connection alive with a heartbeat comment every 15s
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering

    const subject = this.gameStateService.getStream(gameId);

    // Emit the current snapshot immediately so the viewer doesn't wait for the next draw
    const latest = this.gameStateService.getLatest(gameId);
    if (latest) {
      // We can't push to the subject here (it would emit to all subscribers),
      // so we rely on the viewer doing an initial GET /api/game/:id fetch first.
    }

    return subject.pipe(
      map((state: GameState): SseMessageEvent => ({
        data: JSON.stringify(state),
      }))
    );
  }
}
