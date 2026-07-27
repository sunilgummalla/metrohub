import { useState, useEffect, useMemo } from "react";
import "./rummy.css";

// ─── Persistence: localStorage (7-day TTL) + URL share ───────────────────────

// ─── Multi-game persistence (up to 7 games, FIFO eviction) ──────────────────

const ACTIVE_KEY  = "rummy-active-v2";   // current in-progress or just-finished game
const HISTORY_KEY = "rummy-history-v2";  // array of completed games (max 7)
const TTL_MS      = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_HISTORY = 7;

type HistoryEntry = {
  id: string;          // uid assigned when game starts
  savedAt: number;     // timestamp of last save
  state: GameState;    // full finished (or playing) state
};

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as HistoryEntry[];
    const cutoff = Date.now() - TTL_MS;
    return arr.filter((e) => e.savedAt > cutoff);
  } catch { return []; }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch { /* ignore */ }
}

/** Archive the current active game into history (FIFO, max 7). */
function archiveGame(state: GameState, gameId: string) {
  const history = loadHistory();
  // Remove any existing entry with same id (update-in-place)
  const filtered = history.filter((e) => e.id !== gameId);
  const entry: HistoryEntry = { id: gameId, savedAt: Date.now(), state };
  const updated = [...filtered, entry];
  // Keep only the most recent MAX_HISTORY games (drop oldest first)
  if (updated.length > MAX_HISTORY) updated.splice(0, updated.length - MAX_HISTORY);
  saveHistory(updated);
}

type ActiveEnvelope = { id: string; savedAt: number; state: GameState };

// ─── UTF-8 safe base64 helpers ──────────────────────────────────────────────
function toBase64(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  ));
}

function fromBase64(b64: string): string {
  return decodeURIComponent(
    atob(b64).split("").map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
  );
}

function loadGame(): GameState {
  // 1. Try URL hash first (shared link — both owner and read-only)
  try {
    const hash = window.location.hash.slice(1);
    const isOwner = hash.startsWith("rummy:");
    const isRO    = hash.startsWith("rummy-ro:");
    if (isOwner || isRO) {
      const b64  = isOwner ? hash.slice(6) : hash.slice(9);
      const json = fromBase64(b64);
      const parsed = JSON.parse(json) as GameState;
      if (parsed && (parsed.phase === "setup" || parsed.phase === "playing" || parsed.phase === "finished")) {
        if (isOwner) {
          saveActiveGame(parsed, uid());
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
        return parsed;
      }
    }
  } catch { /* ignore */ }

  // 2. Fall back to active localStorage slot
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (raw) {
      const env = JSON.parse(raw) as ActiveEnvelope;
      // Treat missing savedAt as now (back-compat: old plain-state format should not expire immediately)
      const savedAt = typeof env.savedAt === "number" ? env.savedAt : Date.now();
      if (Date.now() - savedAt > TTL_MS) {
        localStorage.removeItem(ACTIVE_KEY);
        return { phase: "setup" };
      }
      if (env.state && (env.state.phase === "setup" || env.state.phase === "playing" || env.state.phase === "finished")) {
        return env.state;
      }
    }
  } catch { /* ignore */ }

  return { phase: "setup" };
}

function saveActiveGame(state: GameState, gameId: string) {
  try {
    const env: ActiveEnvelope = { id: gameId, savedAt: Date.now(), state };
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(env));
  } catch { /* ignore */ }
}

// Legacy key cleanup
function clearActive() {
  localStorage.removeItem(ACTIVE_KEY);
  localStorage.removeItem("rummy-scorecard-v1"); // remove old key if present
}

// Keep saveGame as a thin alias so existing call-sites still compile
function saveGame(state: GameState) { saveActiveGame(state, currentGameId); }
let currentGameId = uid();

function buildShareUrl(state: GameState, readOnly = false): string {
  try {
    const b64 = toBase64(JSON.stringify(state));
    const base = window.location.href.split("#")[0];
    const prefix = readOnly ? "rummy-ro" : "rummy";
    return `${base}#${prefix}:${b64}`;
  } catch {
    return window.location.href;
  }
}

// Detect read-only mode from URL hash (rummy-ro: prefix)
function detectReadOnly(): boolean {
  try {
    return window.location.hash.slice(1).startsWith("rummy-ro:");
  } catch {
    return false;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type RuleConfig = {
  drop: number;
  middleDrop: number;
  fullCount: number;
  winnerBonus: number;
};

export type PlayerEvent =
  | "none"
  | "drop"
  | "middleDrop"
  | "fullCount"
  | "winner";

type Player = {
  id: string;
  name: string;
  status: "active" | "busted" | "rejoined";
};

type RoundEntry = {
  event: PlayerEvent;
  score: number;
  rawInput: number;
};

type Round = {
  id: string;
  entries: Record<string, RoundEntry>; // playerId → entry
  cancelled: boolean; // soft-delete: still visible but struck-through, excluded from totals
};

type GameState =
  | { phase: "setup" }
  | { phase: "playing"; players: Player[]; rounds: Round[]; rules: RuleConfig; targetScore: number }
  | { phase: "finished"; players: Player[]; rounds: Round[]; rules: RuleConfig; targetScore: number };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function effectiveScore(event: PlayerEvent, raw: number, rules: RuleConfig): number {
  switch (event) {
    case "drop":       return rules.drop;
    case "middleDrop": return rules.middleDrop;
    case "fullCount":  return rules.fullCount;
    case "winner":     return rules.winnerBonus;
    default:           return raw;
  }
}

// Only count non-cancelled rounds
function totalScore(rounds: Round[], playerId: string): number {
  return rounds
    .filter((r) => !r.cancelled)
    .reduce((sum, r) => sum + (r.entries[playerId]?.score ?? 0), 0);
}

function isInGame(p: Player) {
  return p.status === "active" || p.status === "rejoined";
}

// Convenience type alias for a player with a computed total
type PlayerWithTotal = Player & { total: number };

// Preserve original player order; just attach totals (no sorting)
function withTotals(
  players: Player[],
  rounds: Round[]
): (Player & { total: number })[] {
  return players.map((p) => ({ ...p, total: totalScore(rounds, p.id) }));
}

// Find the player with the lowest total among active players (for leader display)
function findLeader(players: Player[], rounds: Round[]): (Player & { total: number }) | undefined {
  const active = withTotals(players, rounds).filter((p) => isInGame(p));
  if (active.length === 0) return undefined;
  return active.reduce((best, p) => (p.total < best.total ? p : best));
}

const EVENT_LABELS: Record<PlayerEvent, string> = {
  none: "Score",
  drop: "Drop",
  middleDrop: "Mid Drop",
  fullCount: "Full Count",
  winner: "Winner",
};

const EVENT_COLORS: Record<PlayerEvent, string> = {
  none: "",
  drop: "rummyEventDrop",
  middleDrop: "rummyEventMidDrop",
  fullCount: "rummyEventFull",
  winner: "rummyEventWinner",
};

const DEFAULT_RULES: RuleConfig = {
  drop: 20,
  middleDrop: 40,
  fullCount: 80,
  winnerBonus: 0,
};

const MIN_ROUND_SCORE = 2;

// ─── Game History Browser ─────────────────────────────────────────────────────

function GameHistoryBrowser({
  history,
  onResume,
  onView,
}: {
  history: HistoryEntry[];
  onResume: (entry: HistoryEntry) => void;
  onView: (entry: HistoryEntry) => void;
}) {
  if (history.length === 0) return null;

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  function winnerOf(entry: HistoryEntry): string {
    const s = entry.state;
    if (s.phase !== "finished" && s.phase !== "playing") return "—";
    const pts = s.players.map((p) => ({
      name: p.name,
      total: s.rounds
        .filter((r) => !r.cancelled)
        .reduce((sum, r) => {
          const e = r.entries[p.id];
          return sum + (e ? e.score : 0);
        }, 0),
    }));
    if (pts.length === 0) return "—";
    return pts.reduce((best, p) => (p.total < best.total ? p : best)).name;
  }

  return (
    <div className="rummyHistorySection">
      <div className="rummyHistorySectionHeader">
        <span className="rummyLabel">Recent games</span>
        <span className="rummyHistoryCount">{history.length} / {MAX_HISTORY}</span>
      </div>
      <div className="rummyHistoryList">
        {[...history].reverse().map((entry) => {
          const s = entry.state;
          const isPlaying = s.phase === "playing";
          const playerNames = s.phase !== "setup"
            ? s.players.map((p) => p.name).join(", ")
            : "—";
          const rounds = s.phase !== "setup"
            ? s.rounds.filter((r) => !r.cancelled).length
            : 0;
          return (
            <div
              key={entry.id}
              className={`rummyHistoryCard${isPlaying ? " rummyHistoryCardActive" : ""}`}
            >
              <div className="rummyHistoryCardBody">
                <div className="rummyHistoryCardTop">
                  <span className="rummyHistoryPhase">
                    {isPlaying ? "⏸ In progress" : "✓ Finished"}
                  </span>
                  <span className="rummyHistoryDate">{formatDate(entry.savedAt)}</span>
                </div>
                <div className="rummyHistoryPlayers">{playerNames}</div>
                <div className="rummyHistoryMeta">
                  {rounds} round{rounds !== 1 ? "s" : ""}
                  {s.phase === "finished" && ` · Winner: ${winnerOf(entry)}`}
                  {s.phase !== "setup" && ` · Target: ${s.targetScore}`}
                </div>
              </div>
              <div className="rummyHistoryCardActions">
                {isPlaying && (
                  <button
                    className="rummySecondaryBtn rummyHistoryResumeBtn"
                    type="button"
                    onClick={() => onResume(entry)}
                  >
                    Resume
                  </button>
                )}
                <button
                  className="rummySecondaryBtn"
                  type="button"
                  onClick={() => onView(entry)}
                >
                  View
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Setup Screen ─────────────────────────────────────────────────────────────

function SetupScreen({
  onStart,
  onResume,
  onView,
}: {
  onStart: (players: Player[], target: number, rules: RuleConfig) => void;
  onResume: (entry: HistoryEntry) => void;
  onView: (entry: HistoryEntry) => void;
}) {
  const [history] = useState<HistoryEntry[]>(() => loadHistory());
  const [names, setNames] = useState<string[]>(["", "", ""]);
  const [target, setTarget] = useState(200);
  const [rules, setRules] = useState<RuleConfig>({ ...DEFAULT_RULES });
  const [error, setError] = useState("");

  function updateName(i: number, val: string) {
    setNames((prev: string[]) => prev.map((n: string, idx: number) => (idx === i ? val : n)));
  }

  function updateRule(key: keyof RuleConfig, val: string) {
    const n = Number(val);
    if (!isNaN(n)) setRules((prev: RuleConfig) => ({ ...prev, [key]: n }));
  }

  function addPlayer() {
    if (names.length < 8) setNames((prev: string[]) => [...prev, ""]);
  }

  function removePlayer(i: number) {
    if (names.length > 2) setNames((prev: string[]) => prev.filter((_: string, idx: number) => idx !== i));
  }

  function handleStart() {
    const trimmed = names.map((n: string) => n.trim());
    const valid = trimmed.filter(Boolean);
    if (valid.length < 2) { setError("At least 2 players are required."); return; }
    if (new Set(valid).size !== valid.length) { setError("Player names must be unique."); return; }
    if (target < 50 || target > 1000) { setError("Target score must be between 50 and 1000."); return; }
    setError("");
    onStart(
      valid.map((name: string) => ({ id: uid(), name, status: "active" as const })),
      target,
      rules
    );
  }

  const ruleFields: { key: keyof RuleConfig; label: string; hint: string }[] = [
    { key: "drop",        label: "Drop",         hint: "Points for first drop" },
    { key: "middleDrop",  label: "Middle Drop",   hint: "Points for middle drop" },
    { key: "fullCount",   label: "Full Count",    hint: "Points for full count (also the per-round maximum)" },
    { key: "winnerBonus", label: "Winner Bonus",  hint: "Points added to winner (use negative to reward)" },
  ];

  return (
    <div className="rummySetup">
      <div className="rummySetupCard">
        <div className="rummySetupHeader">
          <span className="rummyBadge">Scoreboards</span>
          <h2>New Rummy Game</h2>
          <p>Configure rules, add players, and set the target score. Lowest score wins.</p>
          <p style={{fontSize:"12px",color:"var(--muted)",marginTop:"2px"}}>Min score per round: 2 &nbsp;·&nbsp; Re-join score: highest active total + 2</p>
        </div>

        <div className="rummyField">
          <label className="rummyLabel">Game Rules</label>
          <div className="rummyRulesGrid">
            {ruleFields.map(({ key, label, hint }) => (
              <div className="rummyRuleField" key={key}>
                <label className="rummyRuleLabel" title={hint}>{label}</label>
                <input
                  className="rummyInput rummyRuleInput"
                  type="number"
                  value={rules[key]}
                  onChange={(e) => updateRule(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rummyField">
          <label className="rummyLabel">Target Score (bust-out threshold)</label>
          <input
            className="rummyInput"
            type="number"
            min={50}
            max={1000}
            step={50}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
          />
        </div>

        <div className="rummyField">
          <label className="rummyLabel">Players ({names.length} / 8)</label>
          <div className="rummyPlayerList">
            {names.map((name: string, i: number) => (
              <div className="rummyPlayerRow" key={i}>
                <span className="rummyPlayerNum">{i + 1}</span>
                <input
                  className="rummyInput"
                  placeholder={`Player ${i + 1}`}
                  value={name}
                  onChange={(e) => updateName(i, e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStart()}
                />
                {names.length > 2 && (
                  <button className="rummyRemoveBtn" onClick={() => removePlayer(i)} type="button" aria-label="Remove player">✕</button>
                )}
              </div>
            ))}
          </div>
          {names.length < 8 && (
            <button className="rummyAddPlayerBtn" onClick={addPlayer} type="button">+ Add player</button>
          )}
        </div>

        {error && <p className="rummyError">{error}</p>}
        <button className="rummyPrimaryBtn" onClick={handleStart} type="button">Start Game</button>
      </div>
      <GameHistoryBrowser history={history} onResume={onResume} onView={onView} />
    </div>
  );
}

// ─── Round Entry Form (used for both new rounds and editing existing ones) ────

function RoundEntryForm({
  players,
  rules,
  roundLabel,
  initialEvents,
  initialRaws,
  onSubmit,
  onCancel,
}: {
  players: Player[];
  rules: RuleConfig;
  roundLabel: string;
  initialEvents?: Record<string, PlayerEvent>;
  initialRaws?: Record<string, string>;
  onSubmit: (entries: Record<string, RoundEntry>) => void;
  onCancel: () => void;
}) {
  const activePlayers = players.filter(isInGame);

  const [events, setEvents] = useState<Record<string, PlayerEvent>>(
    () => initialEvents ?? Object.fromEntries(activePlayers.map((p) => [p.id, "none" as PlayerEvent]))
  );
  const [rawInputs, setRawInputs] = useState<Record<string, string>>(
    initialRaws ?? Object.fromEntries(activePlayers.map((p) => [p.id, ""]))
  );
  const [error, setError] = useState("");

  const needsInput = (event: PlayerEvent) => event === "none";

  function setEvent(id: string, ev: PlayerEvent) {
    setEvents((prev: Record<string, PlayerEvent>) => ({ ...prev, [id]: ev }));
    setError("");
  }

  function setRaw(id: string, val: string) {
    setRawInputs((prev: Record<string, string>) => ({ ...prev, [id]: val }));
  }

  function handleSubmit() {
    const winnerCount = Object.values(events).filter((e) => e === "winner").length;
    if (winnerCount === 0) { setError("Mark one player as the round Winner."); return; }
    if (winnerCount > 1)   { setError("Only one player can be the round Winner."); return; }

    const entries: Record<string, RoundEntry> = {};
    for (const p of activePlayers) {
      const ev = events[p.id];
      if (needsInput(ev)) {
        const raw = rawInputs[p.id].trim();
        if (raw === "") { setError(`Enter a score for ${p.name}.`); return; }
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0) { setError(`Score for ${p.name} must be a non-negative integer.`); return; }
        if (n < MIN_ROUND_SCORE) { setError(`Minimum score per round is ${MIN_ROUND_SCORE}. Increase score for ${p.name}.`); return; }
        if (n > rules.fullCount) { setError(`Score for ${p.name} cannot exceed Full Count (${rules.fullCount}).`); return; }
        entries[p.id] = { event: ev, rawInput: n, score: effectiveScore(ev, n, rules) };
      } else {
        entries[p.id] = { event: ev, rawInput: 0, score: effectiveScore(ev, 0, rules) };
      }
    }
    setError("");
    onSubmit(entries);
  }

  const roundEvents: PlayerEvent[] = ["none", "winner", "drop", "middleDrop", "fullCount"];

  return (
    <div className="rummyEntryPanel">
      <div className="rummyEntryHeader">
        <span className="rummyBadge">{roundLabel}</span>
        <h3>Enter scores for this round</h3>
        <p>Select an event for each active player. "Score" means enter points manually.</p>
      </div>

      <div className="rummyEntryTable">
        <div className="rummyEntryTableHead">
          <span>Player</span>
          <span>Event</span>
          <span>Points</span>
        </div>
        {activePlayers.map((p) => {
          const ev = events[p.id];
          const overridden = !needsInput(ev);
          const preview = overridden ? effectiveScore(ev, 0, rules) : null;
          return (
              <div className={`rummyEntryTableRow ${EVENT_COLORS[ev as PlayerEvent] ?? ""}`} key={p.id}>
              <span className="rummyEntryPlayerName">
                {p.name}
                {p.status === "rejoined" && <span className="rummyRejoinedTag">Re-joined</span>}
              </span>
              <div className="rummyEventPicker">
                {roundEvents.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`rummyEventBtn ${ev === e ? "active" : ""} ${EVENT_COLORS[e]}`}
                    onClick={() => setEvent(p.id, e)}
                  >
                    {EVENT_LABELS[e]}
                  </button>
                ))}
              </div>
              <div className="rummyEntryScore">
                {overridden ? (
                  <span className={`rummyOverriddenScore ${EVENT_COLORS[ev as PlayerEvent] ?? ""}`}>{preview}</span>
                ) : (
                  <input
                    className="rummyInput rummyScoreInput"
                    type="number"
                    min={MIN_ROUND_SCORE}
                    max={rules.fullCount}
                    placeholder={String(MIN_ROUND_SCORE)}
                    value={rawInputs[p.id]}
                    onChange={(e) => setRaw(p.id, e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="rummyError">{error}</p>}
      <div className="rummyEntryActions">
        <button className="rummyPrimaryBtn" onClick={handleSubmit} type="button">
          Save {roundLabel}
        </button>
        <button className="rummySecondaryBtn" onClick={onCancel} type="button">
          Discard
        </button>
      </div>
    </div>
  );
}

// ─── Scorecard Table (rounds as rows, players as columns) ─────────────────────

function Scorecard({
  players,
  rounds,
  targetScore,
  onEditRound,
  onCancelRound,
  onRestoreRound,
}: {
  players: Player[];
  rounds: Round[];
  targetScore: number;
  onEditRound?: (roundId: string) => void;
  onCancelRound?: (roundId: string) => void;
  onRestoreRound?: (roundId: string) => void;
}) {
  // Preserve original player order — no sorting
  const ranked = useMemo(() => withTotals(players, rounds), [players, rounds]);
  // Track which round is pending cancel confirmation
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);

  function requestCancel(roundId: string) {
    setPendingCancelId(roundId);
  }

  function confirmCancel() {
    if (pendingCancelId && onCancelRound) {
      onCancelRound(pendingCancelId);
    }
    setPendingCancelId(null);
  }

  function dismissCancel() {
    setPendingCancelId(null);
  }

  if (rounds.length === 0) {
    return (
      <div className="rummyEmptyBoard">
        <span>No rounds yet — click "Record Round 1" below to start.</span>
      </div>
    );
  }

  return (
    <div className="rummyScoreboard">
      {/* Cancel confirmation banner */}
      {pendingCancelId && (
        <div className="rummyCancelConfirm">
          <span>Cancel this round? Scores will be excluded from all totals (you can restore it later).</span>
          <div className="rummyCancelConfirmActions">
            <button className="rummyDangerBtn" type="button" onClick={confirmCancel}>Yes, cancel round</button>
            <button className="rummySecondaryBtn" type="button" onClick={dismissCancel}>No, keep it</button>
          </div>
        </div>
      )}
      <table className="rummyTable">
        <thead>
          <tr>
            {/* First column: round label + actions */}
            <th className="rummyThRound rummyThRoundLabel">Round</th>
            {/* One column per player — original order preserved */}
            {ranked.map((p: PlayerWithTotal) => (
              <th key={p.id} className="rummyThPlayer rummyThPlayerCol">
                <div className="rummyPlayerColHeader">
                  <span>{p.name}</span>
                  {p.status === "busted" && <span className="rummyBustedTag">Out</span>}
                  {p.status === "rejoined" && <span className="rummyRejoinedTag">Re-joined</span>}
                </div>
              </th>
            ))}
            {/* Total row */}
            <th className="rummyThTotal rummyThTotalCol">Round Sum</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((round, roundIdx) => {
            const isCancelled = round.cancelled;

            // Running totals up to and including this round (only non-cancelled)
            const runningTotals: Record<string, number> = {};
            for (const p of ranked) {
              let sum = 0;
              for (let i = 0; i <= roundIdx; i++) {
                if (!rounds[i].cancelled) {
                  sum += rounds[i].entries[p.id]?.score ?? 0;
                }
              }
              runningTotals[p.id] = sum;
            }

            return (
              <tr key={round.id} className={isCancelled ? "rummyRoundCancelled" : ""}>
                {/* Round label + edit/cancel buttons */}
                <td className="rummyRoundLabelCell">
                  <div className="rummyRoundLabelInner">
                    <span className="rummyRoundNum">R{roundIdx + 1}</span>
                    {!isCancelled && onEditRound && (
                      <button
                        className="rummyIconBtn"
                        title="Edit this round"
                        aria-label="Edit this round"
                        type="button"
                        onClick={() => onEditRound(round.id)}
                      >
                        ✏️
                      </button>
                    )}
                    {!isCancelled && onCancelRound && (
                      <button
                        className={`rummyIconBtn rummyIconBtnDanger ${pendingCancelId === round.id ? "rummyIconBtnActive" : ""}`}
                        title="Cancel this round"
                        aria-label="Cancel this round"
                        type="button"
                        onClick={() => requestCancel(round.id)}
                      >
                        ✕
                      </button>
                    )}
                    {isCancelled && onRestoreRound && (
                      <button
                        className="rummyIconBtn rummyIconBtnRestore"
                        title="Restore this round"
                        aria-label="Restore this round"
                        type="button"
                        onClick={() => onRestoreRound(round.id)}
                      >
                        ↩
                      </button>
                    )}
                  </div>
                </td>

                {/* One cell per player */}
                {ranked.map((p: PlayerWithTotal) => {
                  const entry = round.entries[p.id];
                  if (!entry) {
                    return (
                      <td key={p.id} className="rummyScoreCell rummyRoundAbsent">
                        <span className="rummyScorePts">—</span>
                      </td>
                    );
                  }
                  return (
                    <td
                      key={p.id}
                      className={`rummyScoreCell ${isCancelled ? "" : EVENT_COLORS[entry.event]}`}
                      title={EVENT_LABELS[entry.event]}
                    >
                      <span className="rummyScorePts">
                        {entry.event !== "none" && <span className="rummyEventDot" />}
                        {entry.score}
                      </span>
                      {!isCancelled && (
                        <span className="rummyRunningTotal">{runningTotals[p.id]}</span>
                      )}
                      {entry.event !== "none" && !isCancelled && (
                        <span className="rummyEventTag">{EVENT_LABELS[entry.event]}</span>
                      )}
                    </td>
                  );
                })}

                {/* Round sum column: sum of all players' scores in this round */}
                <td className="rummyRoundRowTotal">
                  {isCancelled ? (
                    <span className="rummyCancelledLabel">Cancelled</span>
                  ) : (
                    <span className="rummyRoundSum">
                      {ranked.reduce((sum: number, p: PlayerWithTotal) => {
                        const e = round.entries[p.id];
                        return sum + (e ? e.score : 0);
                      }, 0)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}

          {/* Final totals row */}
          <tr className="rummyTotalsRow">
            <td className="rummyRoundLabelCell"><strong>Total</strong></td>
            {ranked.map((p: PlayerWithTotal) => {
              const total = p.total;
              const isBusted = p.status === "busted";
              // Leader = lowest total among active players
              const leader = findLeader(players, rounds);
              const isLeader = !isBusted && leader?.id === p.id;
              return (
                <td key={p.id} className={`rummyTotalCell ${isBusted ? "rummyTotalBusted" : isLeader ? "rummyTotalLeader" : ""}`}>
                  <span className="rummyTotalVal">
                    {isLeader && "🏆 "}
                    {total}
                  </span>
                  {!isBusted && (
                    <span className={`rummyToBust ${targetScore - total <= 20 ? "rummyDangerMargin" : ""}`}>
                      {targetScore - total} to bust
                    </span>
                  )}
                  {isBusted && <span className="rummyBustedTag">Bust</span>}
                </td>
              );
            })}
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Rules Summary ────────────────────────────────────────────────────────────

function RulesSummary({ rules }: { rules: RuleConfig }) {
  return (
    <div className="rummyRulesSummary">
      <span className="rummyRuleChip rummyEventDrop">Drop: {rules.drop}</span>
      <span className="rummyRuleChip rummyEventMidDrop">Mid Drop: {rules.middleDrop}</span>
      <span className="rummyRuleChip rummyEventFull">Full Count: {rules.fullCount}</span>
      {rules.winnerBonus !== 0 && (
        <span className="rummyRuleChip rummyEventWinner">Winner Bonus: {rules.winnerBonus}</span>
      )}
      <span className="rummyRuleChip rummyEventRejoin">Re-join: highest + 2</span>
    </div>
  );
}

// ─── Re-join Panel ────────────────────────────────────────────────────────────

function RejoinPanel({
  players,
  rounds,
  onRejoin,
}: {
  players: Player[];
  rounds: Round[];
  onRejoin: (playerId: string) => void;
}) {
  const bustedPlayers = players.filter((p) => p.status === "busted");
  if (bustedPlayers.length === 0) return null;

  const activeTotals = players
    .filter(isInGame)
    .map((p) => totalScore(rounds, p.id));
  const highestActive = activeTotals.length > 0 ? Math.max(...activeTotals) : 0;
  const rejoinScore = highestActive + 2;

  return (
    <div className="rummyRejoinPanel">
      <div className="rummyRejoinPanelHeader">
        <span className="rummyLabel">Busted players</span>
        <span className="rummyRejoinHint">
          Re-joining sets their total to <strong>{rejoinScore}</strong> (highest active {highestActive} + 2)
        </span>
      </div>
      <div className="rummyRejoinList">
        {bustedPlayers.map((p) => (
          <button
            key={p.id}
            className="rummyRejoinBtn"
            type="button"
            onClick={() => onRejoin(p.id)}
          >
            ↩ {p.name} re-joins ({rejoinScore} pts)
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Playing Screen ───────────────────────────────────────────────────────────

type EntryMode =
  | { type: "idle" }
  | { type: "new" }
  | { type: "edit"; roundId: string };

function CopyLinkBtn({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => { window.open(url, "_blank"); });
  }

  return (
    <button
      className={`rummyShareBtn ${copied ? "rummyShareBtnCopied" : ""}`}
      type="button"
      onClick={handleCopy}
    >
      {copied ? `✓ ${label} copied!` : `Copy ${label}`}
    </button>
  );
}

function SharePanel({ game, readOnly }: { game: GameState; readOnly: boolean }) {
  const [open, setOpen] = useState(false);
  const ownerUrl = buildShareUrl(game, false);
  const roUrl = buildShareUrl(game, true);

  if (readOnly) {
    // Read-only viewers only see a single copy button for the read-only link
    return <CopyLinkBtn url={roUrl} label="View link" />;
  }

  return (
    <div className="rummySharePanel">
      <button
        className="rummyShareBtn"
        type="button"
        onClick={() => setOpen((v: boolean) => !v)}
      >
        Share ▾
      </button>
      {open && (
        <div className="rummyShareDropdown">
          <div className="rummyShareDropdownItem">
            <div>
              <strong>Owner link</strong>
              <p>Full access — can record &amp; edit rounds</p>
            </div>
            <CopyLinkBtn url={ownerUrl} label="Owner link" />
          </div>
          <div className="rummyShareDropdownItem">
            <div>
              <strong>View-only link</strong>
              <p>Spectators can follow the scorecard live</p>
            </div>
            <CopyLinkBtn url={roUrl} label="View link" />
          </div>
        </div>
      )}
    </div>
  );
}

function PlayingScreen({
  players,
  rounds,
  rules,
  targetScore,
  game,
  readOnly,
  onAddRound,
  onUpdateRound,
  onCancelRound,
  onRestoreRound,
  onEndGame,
  onRejoin,
}: {
  players: Player[];
  rounds: Round[];
  rules: RuleConfig;
  targetScore: number;
  game: GameState;
  readOnly: boolean;
  onAddRound: (entries: Record<string, RoundEntry>) => void;
  onUpdateRound: (roundId: string, entries: Record<string, RoundEntry>) => void;
  onCancelRound: (roundId: string) => void;
  onRestoreRound: (roundId: string) => void;
  onEndGame: () => void;
  onRejoin: (playerId: string) => void;
}) {
  const [entryMode, setEntryMode] = useState<EntryMode>({ type: "idle" });

  const leader = useMemo(() => findLeader(players, rounds), [players, rounds]);
  const activePlayers = players.filter(isInGame);
  const activeRounds = rounds.filter((r) => !r.cancelled);
  const nextRoundNum = rounds.length + 1;

  function handleEditRound(roundId: string) {
    setEntryMode({ type: "edit", roundId });
  }

  function handleRecordRound() {
    setEntryMode({ type: "new" });
  }

  function handleDiscard() {
    setEntryMode({ type: "idle" });
  }

  function handleAddRound(entries: Record<string, RoundEntry>) {
    onAddRound(entries);
    setEntryMode({ type: "idle" });
  }

  function handleUpdateRound(entries: Record<string, RoundEntry>) {
    if (entryMode.type !== "edit") return;
    onUpdateRound(entryMode.roundId, entries);
    setEntryMode({ type: "idle" });
  }

  // Prefill edit form with existing round data
  const editRound = entryMode.type === "edit"
    ? rounds.find((r) => r.id === entryMode.roundId)
    : undefined;

  const editInitialEvents = editRound
    ? Object.fromEntries(
        players.filter(isInGame).map((p) => [p.id, editRound.entries[p.id]?.event ?? "none"])
      )
    : undefined;

  const editInitialRaws = editRound
    ? Object.fromEntries(
        players.filter(isInGame).map((p) => {
          const entry = editRound.entries[p.id];
          if (!entry) return [p.id, ""];
          // Only prefill raw for manual score entries
          return [p.id, entry.event === "none" ? String(entry.rawInput) : ""];
        })
      )
    : undefined;

  return (
    <div className="rummyPlaying">
      {/* Stats bar */}
      <div className="rummyStatsBar">
        <div className="rummyStat">
          <span>Rounds played</span>
          <strong>{activeRounds.length}</strong>
        </div>
        <div className="rummyStat">
          <span>Target score</span>
          <strong>{targetScore}</strong>
        </div>
        <div className="rummyStat">
          <span>Current leader</span>
          <strong>{activeRounds.length > 0 && leader ? `${leader.name} (${leader.total})` : "—"}</strong>
        </div>
        <div className="rummyStat">
          <span>Active / Total</span>
          <strong>{activePlayers.length} / {players.length}</strong>
        </div>
      </div>

      {/* Rules summary */}
      <RulesSummary rules={rules} />

      {/* Re-join panel — hidden for read-only viewers */}
      {!readOnly && <RejoinPanel players={players} rounds={rounds} onRejoin={onRejoin} />}

      {/* ── SCORECARD (top) ── */}
      <div className="rummySection">
        <div className="rummySectionHeader">
          <h3>Scorecard {readOnly && <span className="rummyReadOnlyBadge">View only</span>}</h3>
          <div className="rummyActions">
            <SharePanel game={game} readOnly={readOnly} />
            {!readOnly && <button className="rummyDangerBtn" onClick={onEndGame} type="button">End game</button>}
          </div>
        </div>
        <Scorecard
          players={players}
          rounds={rounds}
          targetScore={targetScore}
          onEditRound={!readOnly && entryMode.type === "idle" ? handleEditRound : undefined}
          onCancelRound={!readOnly && entryMode.type === "idle" ? onCancelRound : undefined}
          onRestoreRound={!readOnly && entryMode.type === "idle" ? onRestoreRound : undefined}
        />
      </div>

      {/* ── ROUND ENTRY (bottom) — hidden for read-only viewers ── */}
      {!readOnly && (
        <div className="rummyEntrySection">
          {entryMode.type === "idle" && (
            activePlayers.length >= 2 ? (
              <button
                className="rummyRecordRoundBtn"
                type="button"
                onClick={handleRecordRound}
              >
                + Record Round {nextRoundNum}
              </button>
            ) : (
              <div className="rummyEmptyBoard">
                <span>
                  Only {activePlayers.length} active player(s) remaining.
                  {players.some((p) => p.status === "busted") && " Use the Re-join panel above to bring a player back."}
                </span>
              </div>
            )
          )}

          {entryMode.type === "new" && (
            <RoundEntryForm
              players={players}
              rules={rules}
              roundLabel={`Round ${nextRoundNum}`}
              onSubmit={handleAddRound}
              onCancel={handleDiscard}
            />
          )}

          {entryMode.type === "edit" && editRound && (
            <RoundEntryForm
              players={players}
              rules={rules}
              roundLabel={`Edit Round ${rounds.findIndex((r) => r.id === editRound.id) + 1}`}
              initialEvents={editInitialEvents}
              initialRaws={editInitialRaws}
              onSubmit={handleUpdateRound}
              onCancel={handleDiscard}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Finished Screen ──────────────────────────────────────────────────────────

function FinishedScreen({
  players,
  rounds,
  rules,
  targetScore,
  game,
  readOnly,
  onNewGame,
}: {
  players: Player[];
  rounds: Round[];
  rules: RuleConfig;
  targetScore: number;
  game: GameState;
  readOnly: boolean;
  onNewGame: () => void;
}) {
  // Winner = player with lowest total (original order preserved)
  const winner = useMemo(() => {
    const pts = withTotals(players, rounds);
    return pts.reduce((best, p) => (p.total < best.total ? p : best));
  }, [players, rounds]);
  const activeRounds = rounds.filter((r) => !r.cancelled);

  return (
    <div className="rummyFinished">
      <div className="rummyWinnerCard">
        <span className="rummyWinnerTrophy">🏆</span>
        <p className="rummyBadge">Game over</p>
        <h2>{winner.name} wins!</h2>
        <p className="rummyWinnerScore">
          Final score: <strong>{winner.total}</strong> pts across {activeRounds.length} rounds
        </p>
        <div className="rummyFinishedActions">
          <SharePanel game={game} readOnly={readOnly} />
          {!readOnly && (
            <button className="rummyPrimaryBtn rummyNewGameBtn" onClick={onNewGame} type="button">
              ↺ New Game
            </button>
          )}
        </div>
      </div>

      <div className="rummySection">
        <div className="rummySectionHeader">
          <h3>Final Scorecard</h3>
          <RulesSummary rules={rules} />
        </div>
        <Scorecard players={players} rounds={rounds} targetScore={targetScore} />
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export function RummyScorecard() {
  const [game, setGame] = useState<GameState>(() => loadGame());
  const readOnly = detectReadOnly();

  // Stable game ID — recovered from the active envelope or freshly generated
  const gameIdRef = useMemo<{ current: string }>(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_KEY);
      if (raw) {
        const env = JSON.parse(raw) as ActiveEnvelope;
        if (env.id) return { current: env.id };
      }
    } catch { /* ignore */ }
    return { current: uid() };
  }, []);

  // Persist every state change to localStorage (skip for read-only viewers)
  useEffect(() => {
    if (!readOnly) {
      saveActiveGame(game, gameIdRef.current);
      // Archive whenever the game reaches finished state
      if (game.phase === "finished") {
        archiveGame(game, gameIdRef.current);
      }
    }
  }, [game, readOnly, gameIdRef]);

  function startGame(players: Player[], targetScore: number, rules: RuleConfig) {
    // Assign a fresh id for this new game
    gameIdRef.current = uid();
    setGame({ phase: "playing", players, rounds: [], rules, targetScore });
  }

  function recomputePlayerStatuses(players: Player[], rounds: Round[], targetScore: number): Player[] {
    return players.map((p) => {
      const total = totalScore(rounds, p.id);
      if (total >= targetScore) {
        return { ...p, status: "busted" as const };
      }
      // If they were busted but total dropped below target (after cancel/edit), restore
      if (p.status === "busted" && total < targetScore) {
        return { ...p, status: "active" as const };
      }
      return p;
    });
  }

  function addRound(entries: Record<string, RoundEntry>) {
    if (game.phase !== "playing") return;
    const newRound: Round = { id: uid(), entries, cancelled: false };
    const newRounds = [...game.rounds, newRound];
    const updatedPlayers = recomputePlayerStatuses(game.players, newRounds, game.targetScore);
    const stillActive = updatedPlayers.filter(isInGame);

    if (stillActive.length <= 1) {
      setGame({ ...game, phase: "finished", players: updatedPlayers, rounds: newRounds });
    } else {
      setGame({ ...game, players: updatedPlayers, rounds: newRounds });
    }
  }

  function updateRound(roundId: string, entries: Record<string, RoundEntry>) {
    if (game.phase !== "playing") return;
    const newRounds = game.rounds.map((r: Round) =>
      r.id === roundId ? { ...r, entries, cancelled: false } : r
    );
    const updatedPlayers = recomputePlayerStatuses(game.players, newRounds, game.targetScore);
    const stillActive = updatedPlayers.filter(isInGame);

    if (stillActive.length <= 1) {
      setGame({ ...game, phase: "finished", players: updatedPlayers, rounds: newRounds });
    } else {
      setGame({ ...game, players: updatedPlayers, rounds: newRounds });
    }
  }

  function cancelRound(roundId: string) {
    if (game.phase !== "playing") return;
    const newRounds = game.rounds.map((r: Round) =>
      r.id === roundId ? { ...r, cancelled: true } : r
    );
    const updatedPlayers = recomputePlayerStatuses(game.players, newRounds, game.targetScore);
    setGame({ ...game, players: updatedPlayers, rounds: newRounds });
  }

  function restoreRound(roundId: string) {
    if (game.phase !== "playing") return;
    const newRounds = game.rounds.map((r: Round) =>
      r.id === roundId ? { ...r, cancelled: false } : r
    );
    const updatedPlayers = recomputePlayerStatuses(game.players, newRounds, game.targetScore);
    const stillActive = updatedPlayers.filter(isInGame);

    if (stillActive.length <= 1) {
      setGame({ ...game, phase: "finished", players: updatedPlayers, rounds: newRounds });
    } else {
      setGame({ ...game, players: updatedPlayers, rounds: newRounds });
    }
  }

  function endGame() {
    if (game.phase !== "playing") return;
    const finished = { ...game, phase: "finished" as const };
    archiveGame(finished, gameIdRef.current);
    setGame(finished);
  }

  function rejoinPlayer(playerId: string) {
    if (game.phase !== "playing") return;

    const activeTotals = game.players
      .filter(isInGame)
      .map((p: Player) => totalScore(game.rounds, p.id));
    const highestActive = activeTotals.length > 0 ? Math.max(...activeTotals) : 0;
    const rejoinScore = highestActive + 2;
    const currentTotal = totalScore(game.rounds, playerId);
    const adjustment = rejoinScore - currentTotal;

    let newRounds = game.rounds;
    if (adjustment !== 0) {
      const rejoinRound: Round = {
        id: uid(),
        cancelled: false,
        entries: {
          [playerId]: { event: "none", rawInput: adjustment, score: adjustment },
        },
      };
      newRounds = [...game.rounds, rejoinRound];
    }

    const updatedPlayers = game.players.map((p: Player) =>
      p.id === playerId ? { ...p, status: "rejoined" as const } : p
    );

    setGame({ ...game, players: updatedPlayers, rounds: newRounds });
  }

  function resumeGame(entry: HistoryEntry) {
    gameIdRef.current = entry.id;
    saveActiveGame(entry.state, entry.id);
    setGame(entry.state);
  }

  function viewGame(entry: HistoryEntry) {
    // Load the historical game in read-only-like view (finished screen)
    gameIdRef.current = entry.id;
    setGame(entry.state);
  }

  function newGame() {
    // Archive current game if it was in progress before clearing
    if (game.phase === "playing" || game.phase === "finished") {
      archiveGame(game, gameIdRef.current);
    }
    clearActive();
    gameIdRef.current = uid();
    setGame({ phase: "setup" });
  }

  if (game.phase === "setup") {
    return <SetupScreen onStart={startGame} onResume={resumeGame} onView={viewGame} />;
  }

  if (game.phase === "playing") {
    return (
      <PlayingScreen
        players={game.players}
        rounds={game.rounds}
        rules={game.rules}
        targetScore={game.targetScore}
        game={game}
        readOnly={readOnly}
        onAddRound={addRound}
        onUpdateRound={updateRound}
        onCancelRound={cancelRound}
        onRestoreRound={restoreRound}
        onEndGame={endGame}
        onRejoin={rejoinPlayer}
      />
    );
  }

  return (
    <FinishedScreen
      players={game.players}
      rounds={game.rounds}
      rules={game.rules}
      targetScore={game.targetScore}
      game={game}
      readOnly={readOnly}
      onNewGame={newGame}
    />
  );
}
