import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameSync, type GameSyncPayload } from "@metrohub/shared";
import "./poker.css";

const ACTIVE_KEY = "poker-active-v1";
const HISTORY_KEY = "poker-history-v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_HISTORY = 7;
// Must match useGameSync's session key: `game-id-<gameType>` with gameType "poker".
const SYNC_ID_KEY = "game-id-poker";

type TxnKind = "buyIn" | "rebuy" | "addon" | "cashOut";

type Player = {
  id: string;
  name: string;
};

type Transaction = {
  id: string;
  playerId: string;
  kind: TxnKind;
  amount: number;
  note: string;
  createdAt: number;
};

type TxnDraft = Pick<Transaction, "playerId" | "kind" | "amount" | "note">;

type GameState =
  | { phase: "setup" }
  | {
      phase: "playing" | "finished";
      players: Player[];
      transactions: Transaction[];
      startedAt: number;
      finishedAt?: number;
      smallBlind: number;
      bigBlind: number;
    };

type ActiveEnvelope = {
  id: string;
  savedAt: number;
  state: GameState;
};

type HistoryEntry = ActiveEnvelope;

type PlayerLedger = Player & {
  buyInTotal: number;
  cashOutTotal: number;
  net: number;
  txns: Transaction[];
};

const KIND_LABELS: Record<TxnKind, string> = {
  buyIn: "Buy-in",
  rebuy: "Rebuy",
  addon: "Add-on",
  cashOut: "Cash-out",
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - TTL_MS;
    // Validate each entry so a corrupted/older-format record can't crash
    // SetupScreen when it reads entry.state.players / .phase.
    return (parsed as HistoryEntry[]).filter(
      (entry) =>
        entry &&
        typeof entry.id === "string" &&
        typeof entry.savedAt === "number" &&
        entry.savedAt > cutoff &&
        isValidGameState(entry.state)
    );
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage failures.
  }
}

function archiveGame(state: GameState, gameId: string) {
  if (state.phase === "setup") return;
  const next = [
    ...loadHistory().filter((entry) => entry.id !== gameId),
    { id: gameId, savedAt: Date.now(), state },
  ];
  if (next.length > MAX_HISTORY) next.splice(0, next.length - MAX_HISTORY);
  saveHistory(next);
}

function saveActiveGame(state: GameState, gameId: string) {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify({ id: gameId, savedAt: Date.now(), state }));
  } catch {
    // Ignore storage failures.
  }
}

function clearActiveGame() {
  localStorage.removeItem(ACTIVE_KEY);
}

/** Validate a persisted/remote game state shape before trusting it. */
function isValidGameState(state: unknown): state is GameState {
  if (!state || typeof state !== "object") return false;
  const phase = (state as { phase?: unknown }).phase;
  if (phase === "setup") return true;
  if (phase === "playing" || phase === "finished") {
    const s = state as { players?: unknown; transactions?: unknown };
    return Array.isArray(s.players) && Array.isArray(s.transactions);
  }
  return false;
}

function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return { phase: "setup" };
    const envelope = JSON.parse(raw) as ActiveEnvelope;
    // Guard against corrupted / older-format payloads that could crash later.
    if (!envelope || typeof envelope.savedAt !== "number" || !isValidGameState(envelope.state)) {
      clearActiveGame();
      return { phase: "setup" };
    }
    if (Date.now() - envelope.savedAt > TTL_MS) {
      clearActiveGame();
      return { phase: "setup" };
    }
    return envelope.state;
  } catch {
    return { phase: "setup" };
  }
}

function money(value: number) {
  // parseAmount() accepts cents, so show up to 2 fraction digits (10.5 -> $10.50)
  // while keeping whole amounts clean ($100, not $100.00).
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseAmount(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  return Math.round(amount * 100) / 100;
}

function buildLedger(players: Player[], transactions: Transaction[]): PlayerLedger[] {
  return players.map((player) => {
    const txns = transactions.filter((txn) => txn.playerId === player.id);
    const buyInTotal = txns
      .filter((txn) => txn.kind !== "cashOut")
      .reduce((sum, txn) => sum + txn.amount, 0);
    const cashOutTotal = txns
      .filter((txn) => txn.kind === "cashOut")
      .reduce((sum, txn) => sum + txn.amount, 0);
    return {
      ...player,
      buyInTotal,
      cashOutTotal,
      net: cashOutTotal - buyInTotal,
      txns,
    };
  });
}

function ledgerTotals(ledger: PlayerLedger[]) {
  const totalBuyIns = ledger.reduce((sum, row) => sum + row.buyInTotal, 0);
  const totalCashOuts = ledger.reduce((sum, row) => sum + row.cashOutTotal, 0);
  return {
    totalBuyIns,
    totalCashOuts,
    bankBalance: totalBuyIns - totalCashOuts,
    netTotal: ledger.reduce((sum, row) => sum + row.net, 0),
  };
}

function SetupScreen({
  onStart,
}: {
  onStart: (players: Player[], initialBuyIn: number, smallBlind: number, bigBlind: number) => void;
}) {
  const [names, setNames] = useState(["", "", ""]);
  const [initialBuyIn, setInitialBuyIn] = useState("100");
  const [smallBlind, setSmallBlind] = useState("1");
  const [bigBlind, setBigBlind] = useState("2");
  const [error, setError] = useState("");
  const history = useMemo(() => loadHistory(), []);

  function setName(index: number, value: string) {
    setNames((current) => current.map((name, i) => (i === index ? value : name)));
  }

  function addPlayer() {
    if (names.length < 10) setNames((current) => [...current, ""]);
  }

  function removePlayer(index: number) {
    if (names.length > 2) setNames((current) => current.filter((_, i) => i !== index));
  }

  function handleStart() {
    const cleaned = names.map((name) => name.trim()).filter(Boolean);
    const uniqueNames = new Set(cleaned.map((name) => name.toLowerCase()));
    const buyIn = parseAmount(initialBuyIn);
    const sb = parseAmount(smallBlind);
    const bb = parseAmount(bigBlind);

    if (cleaned.length < 2) {
      setError("Add at least two players.");
      return;
    }
    if (uniqueNames.size !== cleaned.length) {
      setError("Player names must be unique.");
      return;
    }
    if (!buyIn) {
      setError("Initial buy-in must be greater than zero.");
      return;
    }
    if (!sb || !bb || sb >= bb) {
      setError("Blinds must be positive, and big blind must be greater than small blind.");
      return;
    }

    onStart(
      cleaned.map((name) => ({ id: uid(), name })),
      buyIn,
      sb,
      bb
    );
  }

  return (
    <div className="pokerSetup">
      <section className="pokerPanel pokerSetupPanel">
        <div className="pokerPanelHeader">
          <span className="pokerBadge">Scoreboards</span>
          <h2>New Poker Game</h2>
          <p>Track buy-ins, rebuys, cash-outs, and net results for a cash game.</p>
        </div>

        <div className="pokerRulesGrid">
          <label className="pokerField">
            <span>Initial buy-in</span>
            <input
              className="pokerInput"
              inputMode="decimal"
              min="1"
              type="number"
              value={initialBuyIn}
              onChange={(event) => setInitialBuyIn(event.target.value)}
            />
          </label>
          <label className="pokerField">
            <span>Small blind</span>
            <input
              className="pokerInput"
              inputMode="decimal"
              min="1"
              type="number"
              value={smallBlind}
              onChange={(event) => setSmallBlind(event.target.value)}
            />
          </label>
          <label className="pokerField">
            <span>Big blind</span>
            <input
              className="pokerInput"
              inputMode="decimal"
              min="1"
              type="number"
              value={bigBlind}
              onChange={(event) => setBigBlind(event.target.value)}
            />
          </label>
        </div>

        <div className="pokerField">
          <span>Players ({names.length} / 10)</span>
          <div className="pokerPlayers">
            {names.map((name, index) => (
              <div className="pokerPlayerSetupRow" key={index}>
                <span className="pokerPlayerNum">{index + 1}</span>
                <input
                  className="pokerInput"
                  placeholder={`Player ${index + 1}`}
                  value={name}
                  onChange={(event) => setName(index, event.target.value)}
                />
                {names.length > 2 && (
                  <button
                    aria-label="Remove player"
                    className="pokerIconBtn pokerDangerSoft"
                    type="button"
                    onClick={() => removePlayer(index)}
                  >
                    x
                  </button>
                )}
              </div>
            ))}
          </div>
          <button className="pokerSecondaryBtn" type="button" onClick={addPlayer}>
            Add player
          </button>
        </div>

        {error && <p className="pokerError">{error}</p>}
        <button className="pokerPrimaryBtn" type="button" onClick={handleStart}>
          Start game
        </button>
      </section>

      {history.length > 0 && (
        <section className="pokerPanel">
          <div className="pokerPanelHeader">
            <span className="pokerBadge">Recent games</span>
            <h3>Saved locally</h3>
          </div>
          <div className="pokerHistoryList">
            {history
              .slice()
              .reverse()
              .map((entry) => {
                const state = entry.state;
                if (state.phase === "setup") return null;
                const ledger = buildLedger(state.players, state.transactions);
                const totals = ledgerTotals(ledger);
                return (
                  <button
                    className="pokerHistoryCard"
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      // Restore the sync session id too, so useGameSync resumes the
                      // same gameId — share links stay valid and later saves/publishes
                      // don't drift to a freshly-generated id.
                      try {
                        localStorage.setItem(SYNC_ID_KEY, entry.id);
                      } catch {
                        // Ignore storage failures.
                      }
                      saveActiveGame(state, entry.id);
                      window.location.reload();
                    }}
                  >
                    <strong>{state.players.map((player) => player.name).join(", ")}</strong>
                    <span>
                      {state.phase} - {money(totals.totalBuyIns)} in - {money(totals.totalCashOuts)} out
                    </span>
                  </button>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}

function CopyLinkBtn({ url, label }: { url: string; label: string }) {
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");

  async function handleCopy() {
    // Clipboard API is unavailable on non-secure origins and can reject when
    // permission is denied — handle both so there's no unhandled rejection and
    // the user gets feedback.
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setStatus("ok");
    } catch {
      setStatus("fail");
    }
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  return (
    <button className="pokerSecondaryBtn" type="button" onClick={handleCopy}>
      {status === "ok" ? `Copied ${label}` : status === "fail" ? "Copy failed — copy manually" : `Copy ${label}`}
    </button>
  );
}

function ShareActions({ shareUrl, readOnly }: { shareUrl: string; readOnly: boolean }) {
  // A single live view link (read-only viewers see updates over SSE in real time).
  return (
    <div className="pokerShareActions">
      {readOnly && <span className="pokerReadOnly">View only</span>}
      <CopyLinkBtn url={shareUrl} label="live view link" />
    </div>
  );
}

const DEFAULT_DRAFT: TxnDraft = { playerId: "", kind: "rebuy", amount: 0, note: "" };

function TransactionForm({
  players,
  mode,
  initial,
  onSubmit,
  onCancel,
}: {
  players: Player[];
  mode: "add" | "edit";
  initial?: TxnDraft;
  onSubmit: (txn: TxnDraft) => void;
  onCancel?: () => void;
}) {
  const seed = initial ?? DEFAULT_DRAFT;
  const [playerId, setPlayerId] = useState(seed.playerId || players[0]?.id || "");
  const [kind, setKind] = useState<TxnKind>(seed.kind);
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [note, setNote] = useState(seed.note);
  const [error, setError] = useState("");

  function handleSubmit() {
    const parsed = parseAmount(amount);
    if (!playerId) {
      setError("Choose a player.");
      return;
    }
    if (!parsed) {
      setError("Enter an amount greater than zero.");
      return;
    }
    onSubmit({ playerId, kind, amount: parsed, note: note.trim() });
    if (mode === "add") {
      setAmount("");
      setNote("");
    }
    setError("");
  }

  return (
    <section className={`pokerPanel ${mode === "edit" ? "pokerEditPanel" : ""}`}>
      <div className="pokerPanelHeader">
        <span className="pokerBadge">Ledger</span>
        <h3>{mode === "edit" ? "Edit transaction" : "Add transaction"}</h3>
      </div>
      <div className="pokerTxnForm">
        <label className="pokerField">
          <span>Player</span>
          <select className="pokerInput" value={playerId} onChange={(event) => setPlayerId(event.target.value)}>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </label>
        <label className="pokerField">
          <span>Type</span>
          <select className="pokerInput" value={kind} onChange={(event) => setKind(event.target.value as TxnKind)}>
            <option value="buyIn">Buy-in</option>
            <option value="rebuy">Rebuy</option>
            <option value="addon">Add-on</option>
            <option value="cashOut">Cash-out</option>
          </select>
        </label>
        <label className="pokerField">
          <span>Amount</span>
          <input
            className="pokerInput"
            inputMode="decimal"
            min="1"
            placeholder="100"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
          />
        </label>
        <label className="pokerField pokerNoteField">
          <span>Note</span>
          <input
            className="pokerInput"
            placeholder="optional"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
          />
        </label>
      </div>
      {error && <p className="pokerError">{error}</p>}
      <div className="pokerFormActions">
        <button className="pokerPrimaryBtn" type="button" onClick={handleSubmit}>
          {mode === "edit" ? "Save changes" : "Add transaction"}
        </button>
        {mode === "edit" && onCancel && (
          <button className="pokerSecondaryBtn" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}

function LedgerTable({
  ledger,
  transactions,
  readOnly,
  editingId,
  onEdit,
  onDelete,
}: {
  ledger: PlayerLedger[];
  transactions: Transaction[];
  readOnly: boolean;
  editingId: string | null;
  onEdit: (txnId: string) => void;
  onDelete: (txnId: string) => void;
}) {
  return (
    <section className="pokerPanel">
      <div className="pokerPanelHeader">
        <span className="pokerBadge">Scorecard</span>
        <h3>Player results</h3>
      </div>

      <div className="pokerLedger">
        <table className="pokerTable">
          <thead>
            <tr>
              <th>Player</th>
              <th>In</th>
              <th>Out</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.name}</strong>
                  <span>{row.txns.length} txns</span>
                </td>
                <td>{money(row.buyInTotal)}</td>
                <td>{money(row.cashOutTotal)}</td>
                <td className={row.net >= 0 ? "pokerPositive" : "pokerNegative"}>
                  {row.net >= 0 ? "+" : ""}
                  {money(row.net)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pokerTxnList">
        {transactions.length === 0 ? (
          <div className="pokerEmpty">No transactions yet.</div>
        ) : (
          transactions
            .slice()
            .reverse()
            .map((txn) => {
              const player = ledger.find((row) => row.id === txn.playerId);
              return (
                <div className={`pokerTxnRow ${editingId === txn.id ? "pokerTxnRowEditing" : ""}`} key={txn.id}>
                  <div>
                    <strong>{player?.name ?? "Unknown player"}</strong>
                    <span>
                      {KIND_LABELS[txn.kind]} - {txn.note || new Date(txn.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <strong>{money(txn.amount)}</strong>
                  {!readOnly && (
                    <div className="pokerTxnRowActions">
                      <button
                        aria-label="Edit transaction"
                        className="pokerIconBtn"
                        type="button"
                        onClick={() => onEdit(txn.id)}
                      >
                        ✎
                      </button>
                      <button
                        aria-label="Delete transaction"
                        className="pokerIconBtn pokerDangerSoft"
                        type="button"
                        onClick={() => onDelete(txn.id)}
                      >
                        x
                      </button>
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>
    </section>
  );
}

function GameScreen({
  game,
  readOnly,
  shareUrl,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onFinish,
  onNewGame,
}: {
  game: Extract<GameState, { phase: "playing" | "finished" }>;
  readOnly: boolean;
  shareUrl: string;
  onAddTransaction: (txn: TxnDraft) => void;
  onUpdateTransaction: (txnId: string, txn: TxnDraft) => void;
  onDeleteTransaction: (txnId: string) => void;
  onFinish: () => void;
  onNewGame: () => void;
}) {
  const ledger = useMemo(() => buildLedger(game.players, game.transactions), [game.players, game.transactions]);
  const totals = useMemo(() => ledgerTotals(ledger), [ledger]);
  const sorted = [...ledger].sort((a, b) => b.net - a.net);
  const leader = sorted[0];

  const [editingId, setEditingId] = useState<string | null>(null);
  const editable = !readOnly && game.phase === "playing";
  const editingTxn = editable && editingId ? game.transactions.find((txn) => txn.id === editingId) : undefined;

  function handleEditSubmit(draft: TxnDraft) {
    if (editingId) onUpdateTransaction(editingId, draft);
    setEditingId(null);
  }

  return (
    <div className="pokerGame">
      <section className="pokerHero">
        <div>
          <span className="pokerBadge">{game.phase === "finished" ? "Game finished" : "Cash game"}</span>
          <h2>Poker Scorecard</h2>
          <p>
            {game.players.length} players - Blinds {money(game.smallBlind)} / {money(game.bigBlind)}
          </p>
        </div>
        <div className="pokerHeroActions">
          <ShareActions shareUrl={shareUrl} readOnly={readOnly} />
          {!readOnly && game.phase === "playing" && (
            <button className="pokerPrimaryBtn" type="button" onClick={onFinish}>
              End game
            </button>
          )}
          {!readOnly && (
            <button className="pokerSecondaryBtn" type="button" onClick={onNewGame}>
              New game
            </button>
          )}
        </div>
      </section>

      <section className="pokerStats">
        <div className="pokerStat">
          <span>Total buy-ins</span>
          <strong>{money(totals.totalBuyIns)}</strong>
        </div>
        <div className="pokerStat">
          <span>Total cash-outs</span>
          <strong>{money(totals.totalCashOuts)}</strong>
        </div>
        <div className={`pokerStat ${totals.bankBalance === 0 ? "pokerBalanced" : ""}`}>
          <span>Table bank</span>
          <strong>{money(totals.bankBalance)}</strong>
        </div>
        <div className="pokerStat">
          <span>Leader</span>
          <strong>{leader ? `${leader.name} ${leader.net >= 0 ? "+" : ""}${money(leader.net)}` : "-"}</strong>
        </div>
      </section>

      {totals.bankBalance !== 0 && (
        <div className="pokerNotice">
          Cash-outs are {money(Math.abs(totals.bankBalance))} {totals.bankBalance > 0 ? "short" : "over"} of buy-ins.
          Balance the bank before settling the game.
        </div>
      )}

      {editable &&
        (editingTxn ? (
          <TransactionForm
            key={editingTxn.id}
            players={game.players}
            mode="edit"
            initial={{
              playerId: editingTxn.playerId,
              kind: editingTxn.kind,
              amount: editingTxn.amount,
              note: editingTxn.note,
            }}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <TransactionForm players={game.players} mode="add" onSubmit={onAddTransaction} />
        ))}

      <LedgerTable
        ledger={ledger}
        transactions={game.transactions}
        readOnly={readOnly || game.phase === "finished"}
        editingId={editingId}
        onEdit={setEditingId}
        onDelete={onDeleteTransaction}
      />
    </div>
  );
}

export function PokerScorecard() {
  const [game, setGame] = useState<GameState>(() => loadGame());

  // ─── SSE live sync (host publishes, read-only viewer subscribes) ────────────
  const onRemoteUpdate = useCallback((remote: GameSyncPayload) => {
    const parsed = remote as unknown as GameState;
    // Validate the remote payload shape before trusting it (same guard as loadGame).
    if (isValidGameState(parsed) && (parsed.phase === "playing" || parsed.phase === "finished")) {
      setGame(parsed);
    }
  }, []);

  const { gameId, isReadOnly, shareUrl, publish, resetGameId } = useGameSync({
    gameType: "poker",
    onRemoteUpdate,
  });
  const readOnly = isReadOnly;

  // Persist every state change to localStorage and publish to viewers (host only)
  useEffect(() => {
    if (readOnly) return;
    saveActiveGame(game, gameId);
    publish(game as unknown as GameSyncPayload);
    if (game.phase === "finished") archiveGame(game, gameId);
  }, [game, readOnly, gameId, publish]);

  function startGame(players: Player[], initialBuyIn: number, smallBlind: number, bigBlind: number) {
    const startedAt = Date.now();
    const transactions = players.map((player) => ({
      id: uid(),
      playerId: player.id,
      kind: "buyIn" as const,
      amount: initialBuyIn,
      note: "Initial buy-in",
      createdAt: startedAt,
    }));
    resetGameId(); // fresh session id so old share links go stale
    setGame({ phase: "playing", players, transactions, startedAt, smallBlind, bigBlind });
  }

  function addTransaction(txn: TxnDraft) {
    if (game.phase !== "playing") return;
    setGame({
      ...game,
      transactions: [...game.transactions, { ...txn, id: uid(), createdAt: Date.now() }],
    });
  }

  function updateTransaction(txnId: string, patch: TxnDraft) {
    if (game.phase !== "playing") return;
    setGame({
      ...game,
      transactions: game.transactions.map((txn) => (txn.id === txnId ? { ...txn, ...patch } : txn)),
    });
  }

  function deleteTransaction(txnId: string) {
    if (game.phase !== "playing") return;
    setGame({ ...game, transactions: game.transactions.filter((txn) => txn.id !== txnId) });
  }

  function finishGame() {
    if (game.phase !== "playing") return;
    const finished = { ...game, phase: "finished" as const, finishedAt: Date.now() };
    archiveGame(finished, gameId);
    setGame(finished);
  }

  function newGame() {
    if (game.phase !== "setup") archiveGame(game, gameId);
    clearActiveGame();
    resetGameId(); // invalidate old share links immediately
    setGame({ phase: "setup" });
  }

  // Read-only viewer that hasn't received the host's first snapshot yet.
  if (readOnly && game.phase === "setup") {
    return (
      <div className="pokerGame">
        <section className="pokerHero">
          <div>
            <span className="pokerBadge">Live view</span>
            <h2>Poker Scorecard</h2>
            <p>Waiting for the host to share the game…</p>
          </div>
        </section>
      </div>
    );
  }

  if (game.phase === "setup") {
    return <SetupScreen onStart={startGame} />;
  }

  return (
    <GameScreen
      game={game}
      readOnly={readOnly}
      shareUrl={shareUrl}
      onAddTransaction={addTransaction}
      onUpdateTransaction={updateTransaction}
      onDeleteTransaction={deleteTransaction}
      onFinish={finishGame}
      onNewGame={newGame}
    />
  );
}
