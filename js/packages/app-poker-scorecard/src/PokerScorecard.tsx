import { useEffect, useMemo, useState } from "react";
import "./poker.css";

const ACTIVE_KEY = "poker-active-v1";
const HISTORY_KEY = "poker-history-v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_HISTORY = 7;

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

function toBase64(value: string): string {
  return btoa(
    encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, part) =>
      String.fromCharCode(parseInt(part, 16))
    )
  );
}

function fromBase64(value: string): string {
  return decodeURIComponent(
    atob(value)
      .split("")
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("")
  );
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const cutoff = Date.now() - TTL_MS;
    return (JSON.parse(raw) as HistoryEntry[]).filter((entry) => entry.savedAt > cutoff);
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

function parseSharedGame(): GameState | undefined {
  try {
    const hash = window.location.hash.slice(1);
    const isOwner = hash.startsWith("poker:");
    const isReadOnly = hash.startsWith("poker-ro:");
    if (!isOwner && !isReadOnly) return undefined;
    const encoded = isOwner ? hash.slice(6) : hash.slice(9);
    const parsed = JSON.parse(fromBase64(encoded)) as GameState;
    if (parsed.phase === "setup" || parsed.phase === "playing" || parsed.phase === "finished") {
      return parsed;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function loadGame(): GameState {
  const shared = parseSharedGame();
  if (shared) return shared;

  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return { phase: "setup" };
    const envelope = JSON.parse(raw) as ActiveEnvelope;
    if (Date.now() - envelope.savedAt > TTL_MS) {
      clearActiveGame();
      return { phase: "setup" };
    }
    return envelope.state;
  } catch {
    return { phase: "setup" };
  }
}

function detectReadOnly(): boolean {
  try {
    return window.location.hash.slice(1).startsWith("poker-ro:");
  } catch {
    return false;
  }
}

function buildShareUrl(state: GameState, readOnly: boolean) {
  try {
    const encoded = toBase64(JSON.stringify(state));
    const base = window.location.href.split("#")[0];
    return `${base}#${readOnly ? "poker-ro" : "poker"}:${encoded}`;
  } catch {
    return window.location.href;
  }
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
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

function ShareActions({ game, readOnly }: { game: GameState; readOnly: boolean }) {
  const [copied, setCopied] = useState("");

  async function copyUrl(asReadOnly: boolean) {
    const url = buildShareUrl(game, asReadOnly);
    await navigator.clipboard.writeText(url);
    setCopied(asReadOnly ? "view" : "owner");
    window.setTimeout(() => setCopied(""), 1800);
  }

  if (readOnly) {
    return <span className="pokerReadOnly">View only</span>;
  }

  return (
    <div className="pokerShareActions">
      <button className="pokerSecondaryBtn" type="button" onClick={() => copyUrl(false)}>
        {copied === "owner" ? "Copied" : "Copy edit link"}
      </button>
      <button className="pokerSecondaryBtn" type="button" onClick={() => copyUrl(true)}>
        {copied === "view" ? "Copied" : "Copy view link"}
      </button>
    </div>
  );
}

function TransactionForm({
  players,
  onAdd,
}: {
  players: Player[];
  onAdd: (txn: Omit<Transaction, "id" | "createdAt">) => void;
}) {
  const [playerId, setPlayerId] = useState(players[0]?.id ?? "");
  const [kind, setKind] = useState<TxnKind>("rebuy");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function handleAdd() {
    const parsed = parseAmount(amount);
    if (!playerId) {
      setError("Choose a player.");
      return;
    }
    if (!parsed) {
      setError("Enter an amount greater than zero.");
      return;
    }
    onAdd({ playerId, kind, amount: parsed, note: note.trim() });
    setAmount("");
    setNote("");
    setError("");
  }

  return (
    <section className="pokerPanel">
      <div className="pokerPanelHeader">
        <span className="pokerBadge">Ledger</span>
        <h3>Add transaction</h3>
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
            onKeyDown={(event) => event.key === "Enter" && handleAdd()}
          />
        </label>
        <label className="pokerField pokerNoteField">
          <span>Note</span>
          <input
            className="pokerInput"
            placeholder="optional"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleAdd()}
          />
        </label>
      </div>
      {error && <p className="pokerError">{error}</p>}
      <button className="pokerPrimaryBtn" type="button" onClick={handleAdd}>
        Add transaction
      </button>
    </section>
  );
}

function LedgerTable({
  ledger,
  transactions,
  readOnly,
  onDelete,
}: {
  ledger: PlayerLedger[];
  transactions: Transaction[];
  readOnly: boolean;
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
                <div className="pokerTxnRow" key={txn.id}>
                  <div>
                    <strong>{player?.name ?? "Unknown player"}</strong>
                    <span>
                      {KIND_LABELS[txn.kind]} - {txn.note || new Date(txn.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <strong>{money(txn.amount)}</strong>
                  {!readOnly && (
                    <button className="pokerIconBtn pokerDangerSoft" type="button" onClick={() => onDelete(txn.id)}>
                      x
                    </button>
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
  onAddTransaction,
  onDeleteTransaction,
  onFinish,
  onNewGame,
}: {
  game: Extract<GameState, { phase: "playing" | "finished" }>;
  readOnly: boolean;
  onAddTransaction: (txn: Omit<Transaction, "id" | "createdAt">) => void;
  onDeleteTransaction: (txnId: string) => void;
  onFinish: () => void;
  onNewGame: () => void;
}) {
  const ledger = useMemo(() => buildLedger(game.players, game.transactions), [game.players, game.transactions]);
  const totals = useMemo(() => ledgerTotals(ledger), [ledger]);
  const sorted = [...ledger].sort((a, b) => b.net - a.net);
  const leader = sorted[0];

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
          <ShareActions game={game} readOnly={readOnly} />
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

      {!readOnly && game.phase === "playing" && (
        <TransactionForm players={game.players} onAdd={onAddTransaction} />
      )}

      <LedgerTable
        ledger={ledger}
        transactions={game.transactions}
        readOnly={readOnly || game.phase === "finished"}
        onDelete={onDeleteTransaction}
      />
    </div>
  );
}

export function PokerScorecard() {
  const [game, setGame] = useState<GameState>(() => loadGame());
  const readOnly = detectReadOnly();
  const gameIdRef = useMemo<{ current: string }>(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_KEY);
      if (raw) {
        const envelope = JSON.parse(raw) as ActiveEnvelope;
        if (envelope.id) return { current: envelope.id };
      }
    } catch {
      // Ignore storage failures.
    }
    return { current: uid() };
  }, []);

  useEffect(() => {
    if (readOnly) return;
    saveActiveGame(game, gameIdRef.current);
    if (game.phase === "finished") archiveGame(game, gameIdRef.current);
  }, [game, readOnly, gameIdRef]);

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
    gameIdRef.current = uid();
    setGame({ phase: "playing", players, transactions, startedAt, smallBlind, bigBlind });
  }

  function addTransaction(txn: Omit<Transaction, "id" | "createdAt">) {
    if (game.phase !== "playing") return;
    setGame({
      ...game,
      transactions: [...game.transactions, { ...txn, id: uid(), createdAt: Date.now() }],
    });
  }

  function deleteTransaction(txnId: string) {
    if (game.phase !== "playing") return;
    setGame({ ...game, transactions: game.transactions.filter((txn) => txn.id !== txnId) });
  }

  function finishGame() {
    if (game.phase !== "playing") return;
    const finished = { ...game, phase: "finished" as const, finishedAt: Date.now() };
    archiveGame(finished, gameIdRef.current);
    setGame(finished);
  }

  function newGame() {
    if (game.phase !== "setup") archiveGame(game, gameIdRef.current);
    clearActiveGame();
    gameIdRef.current = uid();
    setGame({ phase: "setup" });
  }

  if (game.phase === "setup") {
    return <SetupScreen onStart={startGame} />;
  }

  return (
    <GameScreen
      game={game}
      readOnly={readOnly}
      onAddTransaction={addTransaction}
      onDeleteTransaction={deleteTransaction}
      onFinish={finishGame}
      onNewGame={newGame}
    />
  );
}
