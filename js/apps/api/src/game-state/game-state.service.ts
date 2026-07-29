import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Subject } from "rxjs";
import {
  GameSession,
  GameSessionDocument,
  GameParticipant,
  GameParticipantDocument,
  GameArchive,
  GameArchiveDocument,
} from "../database";
import { generateJoinCode, generateGuestHandle } from "@money/shared/wordlists";

export interface GameEntry {
  gameId: string;
  joinCode: string;
  gameType: string;
  /** Arbitrary JSON payload — each app decides what to store */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>;
  updatedAt: number; // epoch ms
}

/** In-memory SSE channel — one Subject per active game */
interface SseChannel {
  subject: Subject<GameEntry>;
}

/**
 * Scaling note:
 * The SSE Subject is stored in-memory and is process-local. This works
 * correctly only when the API is running as a single replica (replicas=1 in
 * the current Docker Swarm deployment). If the API is ever scaled to multiple
 * replicas, a shared pub/sub layer (e.g. Redis Pub/Sub or MongoDB Change
 * Streams) would be required so that host POSTs and viewer SSE connections
 * always receive the same events regardless of which replica they hit.
 *
 * Game state (snapshots) is persisted to MongoDB and survives API restarts.
 */
@Injectable()
export class GameStateService implements OnModuleDestroy {
  private readonly logger = new Logger(GameStateService.name);
  private readonly channels = new Map<string, SseChannel>();

  constructor(
    @InjectModel(GameSession.name)
    private readonly sessionModel: Model<GameSessionDocument>,
    @InjectModel(GameParticipant.name)
    private readonly participantModel: Model<GameParticipantDocument>,
    @InjectModel(GameArchive.name)
    private readonly archiveModel: Model<GameArchiveDocument>,
  ) {}

  onModuleDestroy() {
    for (const channel of this.channels.values()) {
      channel.subject.complete();
    }
    this.channels.clear();
  }

  // ─── Join code ─────────────────────────────────────────────────────────────

  /**
   * Generate a unique join code, retrying up to 10 times on collision.
   * Collision probability is negligible (<0.001%) at expected scale.
   */
  private async uniqueJoinCode(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = generateJoinCode();
      // Check against ALL sessions (not just active) because joinCode has a
      // unique index and ended sessions are only removed by the TTL job, which
      // is not immediate. Filtering by status:active would allow a duplicate
      // key error if the code exists on an ended-but-not-yet-deleted session.
      const exists = await this.sessionModel.exists({ joinCode: code });
      if (!exists) return code;
    }
    // Extremely unlikely — fall back to a timestamped code
    return `game-${Date.now()}`;
  }

  // ─── Publish ───────────────────────────────────────────────────────────────

  /**
   * Host pushes a new state snapshot.
   * Creates the game_sessions document on first call; upserts on subsequent calls.
   * Also creates the host participant record on first call.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async publish(gameId: string, body: Record<string, any>): Promise<GameEntry> {
    const { gameType: rawGameType, ...rest } = body;
    // Validate gameType against the schema enum; reject unknown values early
    // so the MongoDB write never fails with a validation error.
    const VALID_GAME_TYPES = ["tambola", "bingo", "rummy"] as const;
    type ValidGameType = (typeof VALID_GAME_TYPES)[number];
    const gameType: ValidGameType = VALID_GAME_TYPES.includes(rawGameType)
      ? (rawGameType as ValidGameType)
      : "rummy";

    // Check if this is the first publish for this gameId
    let session = await this.sessionModel.findOne({ gameId }).lean();

    // Reject publishes on ended sessions to avoid inconsistent SSE/read state
    if (session && session.status !== "active") {
      throw new Error(`Game ${gameId} has already ended and cannot be updated`);
    }

    let joinCode: string;
    if (!session) {
      // First publish — create the session and host participant
      joinCode = await this.uniqueJoinCode();
      const hostHandle = generateGuestHandle();

      const newSession = await this.sessionModel.create({
        gameId,
        joinCode,
        gameType,
        payload: rest,
        status: "active",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await this.participantModel.create({
        gameId,
        userId: null,
        handle: hostHandle,
        role: "host",
        isGuest: true,
        joinedAt: new Date(),
      });

      session = newSession.toObject();
      this.logger.log(`Game created: ${gameId} (${joinCode})`);
    } else {
      joinCode = session.joinCode;
      // Update payload and reset TTL
      await this.sessionModel.updateOne(
        { gameId },
        {
          $set: {
            payload: rest,
            gameType: String(gameType),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        },
      );
    }

    const entry: GameEntry = {
      gameId,
      joinCode,
      gameType: String(gameType),
      payload: rest,
      updatedAt: Date.now(),
    };

    // Push to SSE channel
    this.getOrCreateChannel(gameId).subject.next(entry);
    return entry;
  }

  // ─── Get latest ────────────────────────────────────────────────────────────

  /**
   * Returns the latest snapshot from MongoDB, or null if the game is unknown
   * or has ended.
   */
  async getLatest(gameId: string): Promise<GameEntry | null> {
    const now = new Date();
    const session = await this.sessionModel
      .findOne({ gameId, status: "active", expiresAt: { $gt: now } })
      .lean();
    if (!session) return null;

    return {
      gameId: session.gameId,
      joinCode: session.joinCode,
      gameType: session.gameType,
      payload: session.payload as Record<string, unknown>,
      updatedAt: session.updatedAt ? new Date(session.updatedAt).getTime() : Date.now(),
    };
  }

  // ─── SSE stream ────────────────────────────────────────────────────────────

  /** Returns the Subject for SSE streaming, creating a channel if needed */
  getStream(gameId: string): Subject<GameEntry> {
    return this.getOrCreateChannel(gameId).subject;
  }

  private getOrCreateChannel(gameId: string): SseChannel {
    let channel = this.channels.get(gameId);
    if (!channel) {
      channel = { subject: new Subject<GameEntry>() };
      this.channels.set(gameId, channel);
    }
    return channel;
  }

  // ─── End game ──────────────────────────────────────────────────────────────

  /**
   * Mark the game as ended and write to game_archives.
   * Called by the host when the game is finished.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async endGame(gameId: string, finalPayload: Record<string, any>): Promise<void> {
    const session = await this.sessionModel
      .findOneAndUpdate(
        { gameId, status: "active" },
        { $set: { status: "ended", payload: finalPayload } },
        { new: true },
      )
      .lean();

    if (!session) return;

    const participants = await this.participantModel
      .find({ gameId })
      .lean();

    const players = participants
      .filter((p) => p.role === "player")
      .map((p) => p.handle);

    await this.archiveModel.create({
      gameId,
      joinCode: session.joinCode,
      gameType: session.gameType,
      finalPayload,
      hostUserId: null,
      players,
      winner: (finalPayload as any).winner ?? null,
      startedAt: session.createdAt ?? new Date(),
      endedAt: new Date(),
    });

    // Complete the SSE channel
    const channel = this.channels.get(gameId);
    if (channel) {
      channel.subject.complete();
      this.channels.delete(gameId);
    }

    this.logger.log(`Game ended and archived: ${gameId}`);
  }

  // ─── Join game ─────────────────────────────────────────────────────────────

  /**
   * Register a participant joining a game by join code.
   * Returns the session entry or null if the code is invalid.
   */
  async joinByCode(
    joinCode: string,
    handle?: string,
  ): Promise<{ gameId: string; joinCode: string; handle: string } | null> {
    const now = new Date();
    const session = await this.sessionModel
      .findOne({
        joinCode: joinCode.toLowerCase(),
        status: "active",
        expiresAt: { $gt: now },
      })
      .lean();

    if (!session) return null;

    const resolvedHandle = handle?.trim() || generateGuestHandle();

    await this.participantModel.create({
      gameId: session.gameId,
      userId: null,
      handle: resolvedHandle,
      role: "player",
      isGuest: true,
      joinedAt: new Date(),
    });

    return {
      gameId: session.gameId,
      joinCode: session.joinCode,
      handle: resolvedHandle,
    };
  }
}
