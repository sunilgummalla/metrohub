import { useState, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RuleConfig = {
  drop: number;         // points for first drop (default 20)
  middleDrop: number;   // points for middle drop (default 40)
  fullCount: number;    // points for full count (default 80)
  winnerBonus: number;  // points SUBTRACTED from winner (default 0, can be negative reward)
  rejoinPenalty: number;// points added when a player re-joins after busting (default 0)
};

export type PlayerEvent =
  | "none"        // normal score entry
  | "drop"        // first drop — score is overridden by rule
  | "middleDrop"  // middle drop — score is overridden by rule
  | "fullCount"   // full count — score is overridden by rule
  | "winner"      // round winner — score is 0 + optional bonus
  | "rejoin";     // re-joined after busting — score reset + penalty

type Player = {
  id: string;
  name: string;
  active: boolean; // false = busted out (not re-joined)
};

type RoundEntry = {
  event: PlayerEvent;
  score: number;      // final effective score for this round
  rawInput: number;   // what the user typed (ignored when event overrides)
};

type Round = {
  id: string;
  entries: Record<string, RoundEntry>; // playerId → entry
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
    case "rejoin":     return rules.rejoinPenalty;
    default:           return raw;
  }
}

function totalScore(rounds: Round[], playerId: string): number {
  return rounds.reduce((sum, r) => sum + (r.entries[playerId]?.score ?? 0), 0);
}

function rankPlayers(
  players: Player[],
  rounds: Round[]
): (Player & { total: number; rank: number })[] {
  const withTotals = players.map((p) => ({ ...p, total: totalScore(rounds, p.id) }));
  withTotals.sort((a, b) => a.total - b.total);
  return withTotals.map((p, i) => ({ ...p, rank: i + 1 }));
}

const EVENT_LABELS: Record<PlayerEvent, string> = {
  none: "Score",
  drop: "Drop",
  middleDrop: "Mid Drop",
  fullCount: "Full Count",
  winner: "Winner",
  rejoin: "Re-join",
};

const EVENT_COLORS: Record<PlayerEvent, string> = {
  none: "",
  drop: "rummyEventDrop",
  middleDrop: "rummyEventMidDrop",
  fullCount: "rummyEventFull",
  winner: "rummyEventWinner",
  rejoin: "rummyEventRejoin",
};

// ─── Default Rules ────────────────────────────────────────────────────────────

const DEFAULT_RULES: RuleConfig = {
  drop: 20,
  middleDrop: 40,
  fullCount: 80,
  winnerBonus: 0,
  rejoinPenalty: 0,
};

// ─── Setup Screen ─────────────────────────────────────────────────────────────

function SetupScreen({ onStart }: { onStart: (players: Player[], target: number, rules: RuleConfig) => void }) {
  const [names, setNames] = useState<string[]>(["", "", ""]);
  const [target, setTarget] = useState(200);
  const [rules, setRules] = useState<RuleConfig>({ ...DEFAULT_RULES });
  const [error, setError] = useState("");

  function updateName(i: number, val: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? val : n)));
  }

  function updateRule(key: keyof RuleConfig, val: string) {
    const n = Number(val);
    if (!isNaN(n)) setRules((prev) => ({ ...prev, [key]: n }));
  }

  function addPlayer() {
    if (names.length < 8) setNames((prev) => [...prev, ""]);
  }

  function removePlayer(i: number) {
    if (names.length > 2) setNames((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleStart() {
    const trimmed = names.map((n) => n.trim());
    const valid = trimmed.filter(Boolean);
    if (valid.length < 2) { setError("At least 2 players are required."); return; }
    if (new Set(valid).size !== valid.length) { setError("Player names must be unique."); return; }
    if (target < 50 || target > 1000) { setError("Target score must be between 50 and 1000."); return; }
    setError("");
    onStart(
      valid.map((name) => ({ id: uid(), name, active: true })),
      target,
      rules
    );
  }

  const ruleFields: { key: keyof RuleConfig; label: string; hint: string }[] = [
    { key: "drop",          label: "Drop",          hint: "Points for first drop" },
    { key: "middleDrop",    label: "Middle Drop",    hint: "Points for middle drop" },
    { key: "fullCount",     label: "Full Count",     hint: "Points for full count" },
    { key: "winnerBonus",   label: "Winner Bonus",   hint: "Points added to winner (use negative to reward)" },
    { key: "rejoinPenalty", label: "Re-join Penalty",hint: "Points added when a player re-joins" },
  ];

  return (
    <div className="rummySetup">
      <div className="rummySetupCard">
        <div className="rummySetupHeader">
          <span className="rummyBadge">Scoreboards</span>
          <h2>New Rummy Game</h2>
          <p>Configure rules, add players, and set the target score. Lowest score wins.</p>
        </div>

        {/* Rule configuration */}
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

        {/* Target score */}
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

        {/* Players */}
        <div className="rummyField">
          <label className="rummyLabel">Players ({names.length} / 8)</label>
          <div className="rummyPlayerList">
            {names.map((name, i) => (
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
    </div>
  );
}

// ─── Round Entry ──────────────────────────────────────────────────────────────

function RoundEntryPanel({
  players,
  rules,
  roundNumber,
  onSubmit,
}: {
  players: Player[];
  rules: RuleConfig;
  roundNumber: number;
  onSubmit: (entries: Record<string, RoundEntry>) => void;
}) {
  const activePlayers = players.filter((p) => p.active);

  const [events, setEvents] = useState<Record<string, PlayerEvent>>(
    Object.fromEntries(activePlayers.map((p) => [p.id, "none"]))
  );
  const [rawInputs, setRawInputs] = useState<Record<string, string>>(
    Object.fromEntries(activePlayers.map((p) => [p.id, ""]))
  );
  const [error, setError] = useState("");

  // Recompute when activePlayers changes (re-join scenario)
  const needsInput = (event: PlayerEvent) => event === "none";

  function setEvent(id: string, ev: PlayerEvent) {
    setEvents((prev) => ({ ...prev, [id]: ev }));
    // Clear error when user makes a selection
    setError("");
  }

  function setRaw(id: string, val: string) {
    setRawInputs((prev) => ({ ...prev, [id]: val }));
  }

  function handleSubmit() {
    // Validate: exactly one winner
    const winnerCount = Object.values(events).filter((e) => e === "winner").length;
    if (winnerCount === 0) { setError("Mark one player as the round Winner."); return; }
    if (winnerCount > 1)   { setError("Only one player can be the round Winner."); return; }

    // Validate raw inputs for "none" events
    const entries: Record<string, RoundEntry> = {};
    for (const p of activePlayers) {
      const ev = events[p.id];
      if (needsInput(ev)) {
        const raw = rawInputs[p.id].trim();
        if (raw === "") { setError(`Enter a score for ${p.name}.`); return; }
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0) { setError(`Score for ${p.name} must be a non-negative integer.`); return; }
        entries[p.id] = { event: ev, rawInput: n, score: effectiveScore(ev, n, rules) };
      } else {
        entries[p.id] = { event: ev, rawInput: 0, score: effectiveScore(ev, 0, rules) };
      }
    }
    setError("");
    onSubmit(entries);
  }

  const allEvents: PlayerEvent[] = ["none", "winner", "drop", "middleDrop", "fullCount", "rejoin"];

  return (
    <div className="rummyEntryPanel">
      <div className="rummyEntryHeader">
        <span className="rummyBadge">Round {roundNumber}</span>
        <h3>Enter scores for this round</h3>
        <p>Select an event for each player. "Score" means enter points manually.</p>
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
            <div className={`rummyEntryTableRow ${EVENT_COLORS[ev]}`} key={p.id}>
              <span className="rummyEntryPlayerName">{p.name}</span>
              <div className="rummyEventPicker">
                {allEvents.map((e) => (
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
                  <span className={`rummyOverriddenScore ${EVENT_COLORS[ev]}`}>{preview}</span>
                ) : (
                  <input
                    className="rummyInput rummyScoreInput"
                    type="number"
                    min={0}
                    placeholder="0"
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
      <button className="rummyPrimaryBtn" onClick={handleSubmit} type="button">
        Save Round {roundNumber}
      </button>
    </div>
  );
}

// ─── Scoreboard ───────────────────────────────────────────────────────────────

function Scoreboard({
  players,
  rounds,
  targetScore,
}: {
  players: Player[];
  rounds: Round[];
  targetScore: number;
}) {
  const ranked = useMemo(() => rankPlayers(players, rounds), [players, rounds]);

  if (rounds.length === 0) {
    return (
      <div className="rummyEmptyBoard">
        <span>No rounds played yet. Enter the first round scores above.</span>
      </div>
    );
  }

  return (
    <div className="rummyScoreboard">
      <table className="rummyTable">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            {rounds.map((_, i) => <th key={i}>R{i + 1}</th>)}
            <th>Total</th>
            <th>Margin</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((p) => {
            const busted = !p.active && p.total >= targetScore;
            return (
              <tr key={p.id} className={busted ? "rummyBusted" : p.rank === 1 ? "rummyLeader" : ""}>
                <td className="rummyRank">{p.rank === 1 ? "🏆" : p.rank}</td>
                <td className="rummyPlayerName">
                  {p.name}
                  {!p.active && <span className="rummyBustedTag">Out</span>}
                </td>
                {rounds.map((r) => {
                  const entry = r.entries[p.id];
                  if (!entry) return <td key={r.id} className="rummyRoundScore">—</td>;
                  return (
                    <td key={r.id} className={`rummyRoundScore ${EVENT_COLORS[entry.event]}`}>
                      <span title={EVENT_LABELS[entry.event]}>{entry.score}</span>
                      {entry.event !== "none" && (
                        <span className="rummyEventTag">{EVENT_LABELS[entry.event]}</span>
                      )}
                    </td>
                  );
                })}
                <td className="rummyTotal" data-busted={busted}>{p.total}</td>
                <td className="rummyMargin">
                  {busted
                    ? <span className="rummyBustedTag">Bust</span>
                    : targetScore - p.total}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Rules Summary Badge ──────────────────────────────────────────────────────

function RulesSummary({ rules }: { rules: RuleConfig }) {
  return (
    <div className="rummyRulesSummary">
      <span className="rummyRuleChip rummyEventDrop">Drop: {rules.drop}</span>
      <span className="rummyRuleChip rummyEventMidDrop">Mid Drop: {rules.middleDrop}</span>
      <span className="rummyRuleChip rummyEventFull">Full Count: {rules.fullCount}</span>
      {rules.winnerBonus !== 0 && (
        <span className="rummyRuleChip rummyEventWinner">Winner Bonus: {rules.winnerBonus}</span>
      )}
      {rules.rejoinPenalty !== 0 && (
        <span className="rummyRuleChip rummyEventRejoin">Re-join: +{rules.rejoinPenalty}</span>
      )}
    </div>
  );
}

// ─── Playing Screen ───────────────────────────────────────────────────────────

function PlayingScreen({
  players,
  rounds,
  rules,
  targetScore,
  onAddRound,
  onUndo,
  onEndGame,
  onRejoin,
}: {
  players: Player[];
  rounds: Round[];
  rules: RuleConfig;
  targetScore: number;
  onAddRound: (entries: Record<string, RoundEntry>) => void;
  onUndo: () => void;
  onEndGame: () => void;
  onRejoin: (playerId: string) => void;
}) {
  const ranked = useMemo(() => rankPlayers(players, rounds), [players, rounds]);
  const leader = ranked[0];
  const bustedPlayers = players.filter((p) => !p.active);
  const activePlayers = players.filter((p) => p.active);

  return (
    <div className="rummyPlaying">
      {/* Stats bar */}
      <div className="rummyStatsBar">
        <div className="rummyStat">
          <span>Rounds played</span>
          <strong>{rounds.length}</strong>
        </div>
        <div className="rummyStat">
          <span>Target score</span>
          <strong>{targetScore}</strong>
        </div>
        <div className="rummyStat">
          <span>Current leader</span>
          <strong>{rounds.length > 0 ? `${leader.name} (${leader.total})` : "—"}</strong>
        </div>
        <div className="rummyStat">
          <span>Active / Total</span>
          <strong>{activePlayers.length} / {players.length}</strong>
        </div>
      </div>

      {/* Rules summary */}
      <RulesSummary rules={rules} />

      {/* Re-join panel */}
      {bustedPlayers.length > 0 && (
        <div className="rummyRejoinPanel">
          <span className="rummyLabel">Busted players — click to re-join:</span>
          <div className="rummyRejoinList">
            {bustedPlayers.map((p) => (
              <button
                key={p.id}
                className="rummyRejoinBtn"
                type="button"
                onClick={() => onRejoin(p.id)}
              >
                ↩ {p.name} re-joins
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Score entry */}
      {activePlayers.length >= 2 ? (
        <RoundEntryPanel
          players={players}
          rules={rules}
          roundNumber={rounds.length + 1}
          onSubmit={onAddRound}
        />
      ) : (
        <div className="rummyEmptyBoard">
          <span>Only {activePlayers.length} active player(s) remaining. End the game or wait for a re-join.</span>
        </div>
      )}

      {/* Scoreboard */}
      <div className="rummySection">
        <div className="rummySectionHeader">
          <h3>Scoreboard</h3>
          <div className="rummyActions">
            {rounds.length > 0 && (
              <button className="rummySecondaryBtn" onClick={onUndo} type="button">↩ Undo last round</button>
            )}
            <button className="rummyDangerBtn" onClick={onEndGame} type="button">End game</button>
          </div>
        </div>
        <Scoreboard players={players} rounds={rounds} targetScore={targetScore} />
      </div>
    </div>
  );
}

// ─── Finished Screen ──────────────────────────────────────────────────────────

function FinishedScreen({
  players,
  rounds,
  rules,
  targetScore,
  onNewGame,
}: {
  players: Player[];
  rounds: Round[];
  rules: RuleConfig;
  targetScore: number;
  onNewGame: () => void;
}) {
  const ranked = useMemo(() => rankPlayers(players, rounds), [players, rounds]);
  const winner = ranked[0];

  return (
    <div className="rummyFinished">
      <div className="rummyWinnerCard">
        <span className="rummyWinnerTrophy">🏆</span>
        <p className="rummyBadge">Game over</p>
        <h2>{winner.name} wins!</h2>
        <p className="rummyWinnerScore">
          Final score: <strong>{winner.total}</strong> pts across {rounds.length} rounds
        </p>
        <button className="rummyPrimaryBtn" onClick={onNewGame} type="button">New Game</button>
      </div>

      <div className="rummySection">
        <div className="rummySectionHeader">
          <h3>Final Standings</h3>
          <RulesSummary rules={rules} />
        </div>
        <Scoreboard players={players} rounds={rounds} targetScore={targetScore} />
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export function RummyScorecard() {
  const [game, setGame] = useState<GameState>({ phase: "setup" });

  function startGame(players: Player[], targetScore: number, rules: RuleConfig) {
    setGame({ phase: "playing", players, rounds: [], rules, targetScore });
  }

  function addRound(entries: Record<string, RoundEntry>) {
    if (game.phase !== "playing") return;
    const newRound: Round = { id: uid(), entries };
    const newRounds = [...game.rounds, newRound];

    // Mark players who have hit or exceeded target as inactive (busted)
    const updatedPlayers = game.players.map((p) => {
      if (!p.active) return p;
      const total = totalScore(newRounds, p.id);
      return { ...p, active: total < game.targetScore };
    });

    const activePlayers = updatedPlayers.filter((p) => p.active);

    // Auto-finish when only 1 or 0 active players remain
    if (activePlayers.length <= 1) {
      setGame({ ...game, phase: "finished", players: updatedPlayers, rounds: newRounds });
    } else {
      setGame({ ...game, players: updatedPlayers, rounds: newRounds });
    }
  }

  function undoLastRound() {
    if (game.phase !== "playing" || game.rounds.length === 0) return;
    const newRounds = game.rounds.slice(0, -1);
    // Reactivate players who were busted by the removed round
    const updatedPlayers = game.players.map((p) => {
      const total = totalScore(newRounds, p.id);
      return { ...p, active: total < game.targetScore };
    });
    setGame({ ...game, players: updatedPlayers, rounds: newRounds });
  }

  function endGame() {
    if (game.phase !== "playing") return;
    setGame({ ...game, phase: "finished" });
  }

  function rejoinPlayer(playerId: string) {
    if (game.phase !== "playing") return;
    const updatedPlayers = game.players.map((p) =>
      p.id === playerId ? { ...p, active: true } : p
    );
    setGame({ ...game, players: updatedPlayers });
  }

  function newGame() {
    setGame({ phase: "setup" });
  }

  if (game.phase === "setup") {
    return <SetupScreen onStart={startGame} />;
  }

  if (game.phase === "playing") {
    return (
      <PlayingScreen
        players={game.players}
        rounds={game.rounds}
        rules={game.rules}
        targetScore={game.targetScore}
        onAddRound={addRound}
        onUndo={undoLastRound}
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
      onNewGame={newGame}
    />
  );
}
