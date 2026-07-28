/**
 * useGameSync — shared SSE-based live sync hook for Tambola and Bingo.
 *
 * Host:
 *   - Generates a stable game ID (UUID stored in localStorage, scoped by game type)
 *   - Publishes state to POST /api/game/:id on every draw
 *   - Returns a shareUrl the host can copy and give to viewers
 *
 * Read-only viewer:
 *   - Detects ?game=<id>&ro=1 in the URL
 *   - Fetches the latest snapshot on mount (GET /api/game/:id)
 *   - Opens an SSE stream (GET /api/game/:id/stream) for live updates
 *
 * The API base URL is resolved from:
 *   1. import.meta.env.VITE_API_URL (set at build time)
 *   2. window.location.origin (same-origin via nginx proxy /api/*)
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface GameSyncState {
  calledNumbers: number[];
  currentNumber: number | null;
  remaining: number;
}

interface UseGameSyncOptions {
  gameType: "tambola" | "bingo";
  /** Called when the read-only viewer receives a live update from the host */
  onRemoteUpdate?: (state: GameSyncState) => void;
}

interface UseGameSyncResult {
  gameId: string;
  isReadOnly: boolean;
  shareUrl: string;
  /** Host calls this after every draw to push state to the API */
  publish: (state: GameSyncState) => void;
}

function getApiBase(): string {
  // VITE_API_URL is injected at build time (e.g. https://api.example.com)
  // Falls back to same-origin (nginx proxies /api/* to the API service)
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

function getOrCreateGameId(gameType: string): string {
  const key = `game-id-${gameType}`;
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

function detectReadOnly(): { isReadOnly: boolean; gameId: string | null } {
  try {
    const params = new URLSearchParams(window.location.search);
    const ro = params.get("ro");
    const gameId = params.get("game");
    if (ro === "1" && gameId) return { isReadOnly: true, gameId };
  } catch { /* ignore */ }
  return { isReadOnly: false, gameId: null };
}

export function useGameSync({
  gameType,
  onRemoteUpdate,
}: UseGameSyncOptions): UseGameSyncResult {
  const { isReadOnly, gameId: roGameId } = detectReadOnly();

  const [gameId] = useState<string>(() =>
    isReadOnly ? (roGameId ?? generateUUID()) : getOrCreateGameId(gameType)
  );

  const apiBase = getApiBase();
  const shareUrl = `${window.location.origin}${window.location.pathname}?game=${gameId}&ro=1`;

  const publishRef = useRef<(state: GameSyncState) => void>(() => {});

  // ─── Host: publish state to API ───────────────────────────────────────────
  const publish = useCallback(
    (state: GameSyncState) => {
      const url = `${apiBase}/api/game/${gameId}`;
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType, ...state }),
      }).catch(() => {
        // Silently ignore network errors — game still works offline
      });
    },
    [apiBase, gameId, gameType]
  );

  publishRef.current = publish;

  // ─── Read-only viewer: subscribe to SSE stream ────────────────────────────
  useEffect(() => {
    if (!isReadOnly || !onRemoteUpdate) return;

    const apiBase = getApiBase();

    // 1. Fetch the latest snapshot immediately so the viewer doesn't wait
    fetch(`${apiBase}/api/game/${gameId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && Array.isArray(data.calledNumbers)) {
          onRemoteUpdate({
            calledNumbers: data.calledNumbers,
            currentNumber: data.currentNumber,
            remaining: data.remaining,
          });
        }
      })
      .catch(() => { /* ignore */ });

    // 2. Open SSE stream for live updates
    const es = new EventSource(`${apiBase}/api/game/${gameId}/stream`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && Array.isArray(data.calledNumbers)) {
          onRemoteUpdate({
            calledNumbers: data.calledNumbers,
            currentNumber: data.currentNumber,
            remaining: data.remaining,
          });
        }
      } catch { /* ignore */ }
    };

    es.onerror = () => {
      // EventSource auto-reconnects on error — nothing to do
    };

    return () => {
      es.close();
    };
  }, [isReadOnly, gameId, onRemoteUpdate]);

  return {
    gameId,
    isReadOnly,
    shareUrl,
    publish,
  };
}
