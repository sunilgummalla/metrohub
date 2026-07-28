import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Subject } from "rxjs";

export interface GameState {
  gameId: string;
  gameType: "tambola" | "bingo";
  calledNumbers: number[];
  currentNumber: number | null;
  remaining: number;
  updatedAt: number; // epoch ms
}

interface GameEntry {
  state: GameState;
  subject: Subject<GameState>;
  expiresAt: number;
}

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class GameStateService implements OnModuleDestroy {
  private readonly games = new Map<string, GameEntry>();
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(
      () => this.cleanup(),
      CLEANUP_INTERVAL_MS
    );
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
    for (const entry of this.games.values()) {
      entry.subject.complete();
    }
    this.games.clear();
  }

  /** Host pushes a new state snapshot */
  publish(gameId: string, state: Omit<GameState, "gameId" | "updatedAt">): GameState {
    const full: GameState = { ...state, gameId, updatedAt: Date.now() };
    let entry = this.games.get(gameId);
    if (!entry) {
      entry = {
        state: full,
        subject: new Subject<GameState>(),
        expiresAt: Date.now() + TTL_MS,
      };
      this.games.set(gameId, entry);
    } else {
      entry.state = full;
      entry.expiresAt = Date.now() + TTL_MS;
    }
    entry.subject.next(full);
    return full;
  }

  /** Returns the latest snapshot, or null if not found / expired */
  getLatest(gameId: string): GameState | null {
    const entry = this.games.get(gameId);
    if (!entry || Date.now() > entry.expiresAt) return null;
    return entry.state;
  }

  /** Returns an Observable of state updates for SSE streaming */
  getStream(gameId: string): Subject<GameState> {
    let entry = this.games.get(gameId);
    if (!entry) {
      // Create a placeholder so the viewer can connect before the host starts
      const placeholder: GameState = {
        gameId,
        gameType: "tambola",
        calledNumbers: [],
        currentNumber: null,
        remaining: 0,
        updatedAt: Date.now(),
      };
      entry = {
        state: placeholder,
        subject: new Subject<GameState>(),
        expiresAt: Date.now() + TTL_MS,
      };
      this.games.set(gameId, entry);
    }
    return entry.subject;
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, entry] of this.games.entries()) {
      if (now > entry.expiresAt) {
        entry.subject.complete();
        this.games.delete(id);
      }
    }
  }
}
