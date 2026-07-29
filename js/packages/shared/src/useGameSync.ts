/**
 * useGameSync — generic SSE-based live share hook
 *
 * Isolation guarantee:
 *   Each game *session* has its own UUID. The UUID is stored in localStorage
 *   under `game-id-<gameType>` but is REPLACED with a fresh UUID whenever
 *   `resetGameId()` is called (i.e. when the host starts a New Game).
 *   This means concurrent games of the same type on different devices never
 *   collide because each device holds its own UUID, and a new game on the
 *   same device gets a new UUID.
 *
 * Host flow:
 *   1. `useGameSync` returns a stable `gameId` and a `publish(payload)` fn.
 *   2. After every state change the host calls `publish(payload)`.
 *   3. When the host starts a New Game they call `resetGameId()` — this
 *      generates a fresh UUID so the old share link becomes stale.
 *   4. The `shareUrl` (returned by the hook) always reflects the current gameId.
 *
 * Read-only viewer:
 *   - Detects `?game=<id>&ro=1` in the URL
 *   - Fetches the latest snapshot on mount  (GET /api/game/:id)
 *   - Opens an SSE stream                   (GET /api/game/:id/stream)
 *
 * API base URL resolution:
 *   1. import.meta.env.VITE_API_URL  (set at build time)
 *   2. window.location.origin        (same-origin via nginx proxy /api/*)
 *
 * Scaling note:
 *   Game state is stored in-memory in the API process. This works correctly
 *   only when the API is running as a single replica (which is the case in
 *   the current Docker Swarm deployment). If the API is ever scaled to
 *   multiple replicas, sticky routing or a shared store (e.g. Redis) would
 *   be required.
 */
import { useCallback, useEffect, useState } from "react";

// ─── Public types ─────────────────────────────────────────────────────────────

/** Arbitrary JSON payload — each app decides what fields to include */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GameSyncPayload = Record<string, any>;

export interface UseGameSyncOptions {
  /** Identifies the game type (e.g. "tambola", "bingo", "rummy") */
  gameType: string;
  /**
   * Called on read-only viewers whenever the host publishes a new state.
   * The callback receives the raw app payload (already unwrapped from the
   * API's GameEntry wrapper).
   */
  onRemoteUpdate?: (payload: GameSyncPayload) => void;
}

export interface UseGameSyncResult {
  /** Current game session UUID */
  gameId: string;
  /** True when the page was opened via a read-only share link (?ro=1) */
  isReadOnly: boolean;
  /** Full URL that read-only viewers should open */
  shareUrl: string;
  /**
   * Host calls this after every state change to push the latest snapshot
   * to the API so viewers receive it via SSE.
   */
  publish: (payload: GameSyncPayload) => void;
  /**
   * Host calls this when starting a New Game.
   * Generates a fresh UUID so old share links go stale.
   */
  resetGameId: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getApiBase(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viteApiUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    if (viteApiUrl) return viteApiUrl;
  } catch { /* ignore */ }
  return window.location.origin;
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function storageKey(gameType: string) {
  return `game-id-${gameType}`;
}

function getOrCreateGameId(gameType: string): string {
  const key = storageKey(gameType);
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = generateUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return generateUUID();
  }
}

function persistGameId(gameType: string, id: string) {
  try { localStorage.setItem(storageKey(gameType), id); } catch { /* ignore */ }
}

function detectReadOnly(): { isReadOnly: boolean; gameId: string | null } {
  try {
    const params = new URLSearchParams(window.location.search);
    const ro = params.get("ro");
    const gameId = params.get("game");
    if (ro === "1" && gameId) return { isReadOnly: true, gameId };
  } catch { /* ignore */ }
  return { isReadOnly: false, gameId: null };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGameSync({
  gameType,
  onRemoteUpdate,
}: UseGameSyncOptions): UseGameSyncResult {
  const { isReadOnly, gameId: roGameId } = detectReadOnly();

  // gameId is mutable on the host (resetGameId replaces it)
  const [gameId, setGameId] = useState<string>(() =>
    isReadOnly ? (roGameId ?? generateUUID()) : getOrCreateGameId(gameType)
  );

  const apiBase = getApiBase();
  const shareUrl = `${window.location.origin}${window.location.pathname}?game=${gameId}&ro=1`;

  // ─── Host: publish payload to API ─────────────────────────────────────────
  const publish = useCallback(
    (payload: GameSyncPayload) => {
      fetch(`${apiBase}/api/game/${gameId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType, ...payload }),
      }).catch(() => {
        // Silently ignore — game still works offline
      });
    },
    [apiBase, gameId, gameType]
  );

  // ─── Host: reset game ID (call on New Game) ────────────────────────────────
  const resetGameId = useCallback(() => {
    const newId = generateUUID();
    persistGameId(gameType, newId);
    setGameId(newId);
  }, [gameType]);

  // ─── Read-only viewer: subscribe to SSE stream ────────────────────────────
  useEffect(() => {
    if (!isReadOnly || !gameId || !onRemoteUpdate) return;

    // 1. Fetch latest snapshot immediately (no waiting for first SSE event)
    fetch(`${apiBase}/api/game/${gameId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((entry) => {
        // API returns GameEntry: { gameId, gameType, payload, updatedAt }
        // Unwrap payload before forwarding to the caller
        const payload = entry?.payload ?? entry;
        if (payload) onRemoteUpdate(payload as GameSyncPayload);
      })
      .catch(() => { /* ignore */ });

    // 2. Open SSE stream for live updates
    const es = new EventSource(`${apiBase}/api/game/${gameId}/stream`);
    es.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data);
        // Unwrap payload before forwarding to the caller
        const payload = entry?.payload ?? entry;
        if (payload) onRemoteUpdate(payload as GameSyncPayload);
      } catch { /* ignore */ }
    };
    // EventSource auto-reconnects on error — nothing to do
    return () => { es.close(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReadOnly, gameId, apiBase]);
  // Note: onRemoteUpdate is intentionally excluded from deps — callers should
  // wrap it in useCallback. Including it would cause the SSE connection to
  // reconnect on every render.

  return { gameId, isReadOnly, shareUrl, publish, resetGameId };
}
