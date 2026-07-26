import { useState, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Player = {
  id: string;
  name: string;
};

type Round = {
  id: string;
  scores: Record<string, number>; // playerId → points for that round
};

type GameState =
  | { phase: "setup" }
  | { phase: "playing"; players: Player[]; rounds: Round[]; targetScore: number }
  | { phase: "finished"; players: Player[]; rounds: Round[]; targetScore: number };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function totalScore(rounds: Round[], playerId: string): number {
  return rounds.reduce((sum, r) => sum + (r.scores[playerId] ?? 0), 0);
}

function rankPlayers(players: Player[], rounds: Round[]): (Player & { total: number; rank: number })[] {
  const withTotals = players.map((p) => ({ ...p, total: totalScore(rounds, p.id) }));
  withTotals.sort((a, b) => a.total - b.total); // lowest score wins in Rummy
  return withTotals.map((p, i) => ({ ...p, rank: i + 1 }));
}

// ─── Setup Screen ─────────────────────────────────────────────────────────────

function SetupScreen({ onStart }: { onStart: (players: Player[], target: number) => void }) {
  const [names, setNames] = useState<string[]>(["", "", ""]);
  const [target, setTarget] = useState(200);
  const [error, setError] = useState("");

  function updateName(i: number, val: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? val : n)));
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
    if (valid.length < 2) {
      setError("At least 2 players are required.");
      return;
    }
    if (new Set(valid).size !== valid.length) {
      setError("Player names must be unique.");
      return;
    }
    if (target < 50 || target > 1000) {
      setError("Target score must be between 50 and 1000.");
      return;
    }
    setError("");
    onStart(valid.map((name) => ({ id: uid(), name })), target);
  }

  return (
    <div className="rummySetup">
      <div className="rummySetupCard">
        <div className="rummySetupHeader">
          <span className="rummyBadge">Scoreboards</span>
          <h2>New Rummy Game</h2>
          <p>Add players and set the target score. Lowest score wins.</p>
        </div>

        <div className="rummyField">
          <label className="rummyLabel">Target Score (points to bust out)</label>
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
                  <button className="rummyRemoveBtn" onClick={() => removePlayer(i)} type="button" aria-label="Remove player">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {names.length < 8 && (
            <button className="rummyAddPlayerBtn" onClick={addPlayer} type="button">
              + Add player
            </button>
          )}
        </div>

        {error && <p className="rummyError">{error}</p>}

        <button className="rummyPrimaryBtn" onClick={handleStart} type="button">
          Start Game
        </button>
      </div>
    </div>
  );
}

// ─── Score Entry Row ──────────────────────────────────────────────────────────

function ScoreEntryRow({
  players,
  onSubmit,
  roundNumber
}: {
  players: Player[];
  roundNumber: number;
  onSubmit: (scores: Record<string, number>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(players.map((p) => [p.id, ""]))
  );
  const [error, setError] = useState("");

  function update(id: string, val: string) {
    setValues((prev) => ({ ...prev, [id]: val }));
  }

  function handleSubmit() {
    const parsed: Record<string, number> = {};
    for (const p of players) {
      const raw = values[p.id].trim();
      if (raw === "") {
        setError(`Enter a score for ${p.name}.`);
        return;
      }
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0) {
        setError(`Score for ${p.name} must be a non-negative integer.`);
        return;
      }
      parsed[p.id] = n;
    }
    setError("");
    onSubmit(parsed);
  }

  return (
    <div className="rummyEntryPanel">
      <div className="rummyEntryHeader">
        <span className="rummyBadge">Round {roundNumber}</span>
        <h3>Enter scores for this round</h3>
        <p>Enter the points each player accumulated. The player who went out scores 0.</p>
      </div>
      <div className="rummyEntryGrid">
        {players.map((p) => (
          <div className="rummyEntryField" key={p.id}>
            <label className="rummyLabel">{p.name}</label>
            <input
              className="rummyInput rummyScoreInput"
              type="number"
              min={0}
              placeholder="0"
              value={values[p.id]}
              onChange={(e) => update(p.id, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
        ))}
      </div>
      {error && <p className="rummyError">{error}</p>}
      <button className="rummyPrimaryBtn" onClick={handleSubmit} type="button">
        Save Round {roundNumber}
      </button>
    </div>
  );
}

// ─── Scoreboard Table ─────────────────────────────────────────────────────────

function Scoreboard({
  players,
  rounds,
  targetScore,
  compact = false
}: {
  players: Player[];
  rounds: Round[];
  targetScore: number;
  compact?: boolean;
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
    <div className={`rummyScoreboard ${compact ? "rummyScoreboardCompact" : ""}`}>
      <table className="rummyTable">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            {rounds.map((_, i) => (
              <th key={i}>R{i + 1}</th>
            ))}
            <th>Total</th>
            <th>Margin</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((p) => {
            const busted = p.total >= targetScore;
            return (
              <tr key={p.id} className={busted ? "rummyBusted" : p.rank === 1 ? "rummyLeader" : ""}>
                <td className="rummyRank">
                  {p.rank === 1 ? "🏆" : p.rank}
                </td>
                <td className="rummyPlayerName">{p.name}</td>
                {rounds.map((r) => (
                  <td key={r.id} className="rummyRoundScore">
                    {r.scores[p.id] ?? "—"}
                  </td>
                ))}
                <td className="rummyTotal" data-busted={busted}>
                  {p.total}
                </td>
                <td className="rummyMargin">
                  {busted ? <span className="rummyBustedTag">Bust</span> : targetScore - p.total}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Playing Screen ───────────────────────────────────────────────────────────

function PlayingScreen({
  players,
  rounds,
  targetScore,
  onAddRound,
  onUndo,
  onEndGame
}: {
  players: Player[];
  rounds: Round[];
  targetScore: number;
  onAddRound: (scores: Record<string, number>) => void;
  onUndo: () => void;
  onEndGame: () => void;
}) {
  const ranked = useMemo(() => rankPlayers(players, rounds), [players, rounds]);
  const leader = ranked[0];
  const bustedPlayers = ranked.filter((p) => p.total >= targetScore);

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
          <span>Players busted</span>
          <strong>{bustedPlayers.length} / {players.length}</strong>
        </div>
      </div>

      {/* Score entry */}
      <ScoreEntryRow
        players={players}
        roundNumber={rounds.length + 1}
        onSubmit={onAddRound}
      />

      {/* Scoreboard */}
      <div className="rummySection">
        <div className="rummySectionHeader">
          <h3>Scoreboard</h3>
          <div className="rummyActions">
            {rounds.length > 0 && (
              <button className="rummySecondaryBtn" onClick={onUndo} type="button">
                ↩ Undo last round
              </button>
            )}
            <button className="rummyDangerBtn" onClick={onEndGame} type="button">
              End game
            </button>
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
  targetScore,
  onNewGame
}: {
  players: Player[];
  rounds: Round[];
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
        <p className="rummyWinnerScore">Final score: <strong>{winner.total}</strong> points across {rounds.length} rounds</p>
        <button className="rummyPrimaryBtn" onClick={onNewGame} type="button">
          New Game
        </button>
      </div>

      <div className="rummySection">
        <div className="rummySectionHeader">
          <h3>Final Standings</h3>
        </div>
        <Scoreboard players={players} rounds={rounds} targetScore={targetScore} />
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export function RummyScorecard() {
  const [game, setGame] = useState<GameState>({ phase: "setup" });

  function startGame(players: Player[], targetScore: number) {
    setGame({ phase: "playing", players, rounds: [], targetScore });
  }

  function addRound(scores: Record<string, number>) {
    if (game.phase !== "playing") return;
    const newRound: Round = { id: uid(), scores };
    const newRounds = [...game.rounds, newRound];
    // Auto-end: all but one player busted
    const ranked = rankPlayers(game.players, newRounds);
    const activePlayers = ranked.filter((p) => p.total < game.targetScore);
    if (activePlayers.length <= 1) {
      setGame({ ...game, phase: "finished", rounds: newRounds });
    } else {
      setGame({ ...game, rounds: newRounds });
    }
  }

  function undoLastRound() {
    if (game.phase !== "playing" || game.rounds.length === 0) return;
    setGame({ ...game, rounds: game.rounds.slice(0, -1) });
  }

  function endGame() {
    if (game.phase !== "playing") return;
    setGame({ ...game, phase: "finished" });
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
        targetScore={game.targetScore}
        onAddRound={addRound}
        onUndo={undoLastRound}
        onEndGame={endGame}
      />
    );
  }

  return (
    <FinishedScreen
      players={game.players}
      rounds={game.rounds}
      targetScore={game.targetScore}
      onNewGame={newGame}
    />
  );
}
