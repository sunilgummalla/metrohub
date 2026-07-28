import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Subject } from "rxjs";

export interface GameEntry {
  gameId: string;
  gameType: string;
  /** Arbitrary JSON payload — each app decides what to store */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>;
  updatedAt: number; // epoch ms
}

interface GameRecord {
  entry: GameEntry;
  subject: Subject<GameEntry>;
  expiresAt: number;
}

const TTL_MS = 24 * 60 * 60 * 1000;        // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class GameStateService implements OnModuleDestroy {
  private readonly games = new Map<string, GameRecord>();
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
    for (const record of this.games.values()) {
      record.subject.complete();
    }
    this.games.clear();
  }

  /**
   * Host pushes a new state snapshot.
   * `body` is the raw POST body — gameType is extracted, everything else is payload.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publish(gameId: string, body: Record<string, any>): GameEntry {
    const { gameType = "unknown", ...rest } = body;
    const entry: GameEntry = {
      gameId,
      gameType: String(gameType),
      payload: rest,
      updatedAt: Date.now(),
    };

    let record = this.games.get(gameId);
    if (!record) {
      record = {
        entry,
        subject: new Subject<GameEntry>(),
        expiresAt: Date.now() + TTL_MS,
      };
      this.games.set(gameId, record);
    } else {
      record.entry = entry;
      record.expiresAt = Date.now() + TTL_MS;
    }
    record.subject.next(entry);
    return entry;
  }

  /** Returns the latest snapshot, or null if not found / expired */
  getLatest(gameId: string): GameEntry | null {
    const record = this.games.get(gameId);
    if (!record || Date.now() > record.expiresAt) return null;
    return record.entry;
  }

  /** Returns the Subject for SSE streaming */
  getStream(gameId: string): Subject<GameEntry> {
    let record = this.games.get(gameId);
    if (!record) {
      // Create a placeholder so the viewer can connect before the host starts
      record = {
        entry: { gameId, gameType: "unknown", payload: {}, updatedAt: Date.now() },
        subject: new Subject<GameEntry>(),
        expiresAt: Date.now() + TTL_MS,
      };
      this.games.set(gameId, record);
    }
    return record.subject;
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, record] of this.games.entries()) {
      if (now > record.expiresAt) {
        record.subject.complete();
        this.games.delete(id);
      }
    }
  }
}
