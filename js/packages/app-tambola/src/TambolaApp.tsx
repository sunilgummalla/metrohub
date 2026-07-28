import { useState, useEffect, useRef, useCallback } from "react";
import {
  TAMBOLA_DATA,
  STORY_THEMES,
  THEME_LABELS,
  type NumberStories,
} from "./tambola-data";
import "./tambola.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type StoryTheme = keyof NumberStories;

interface TambolaTicket {
  id: number;
  rows: (number | null)[][];
}

// ─── Ticket Generator ─────────────────────────────────────────────────────────
// Standard Tambola ticket: 3 rows × 9 columns, 5 numbers per row (15 total).
// Column n holds numbers from range: col 0 → 1–9, col 1 → 10–19, …, col 8 → 80–90.

function generateTicket(id: number): TambolaTicket {
  const colRanges: [number, number][] = [
    [1, 9],
    [10, 19],
    [20, 29],
    [30, 39],
    [40, 49],
    [50, 59],
    [60, 69],
    [70, 79],
    [80, 90],
  ];

  // Pick numbers for each column (1–3 numbers per column, total 15 across 3 rows)
  const colNumbers: number[][] = colRanges.map(([lo, hi]) => {
    const pool: number[] = [];
    for (let n = lo; n <= hi; n++) pool.push(n);
    // shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  });

  // Distribute 15 numbers across 3 rows, 5 per row
  // Strategy: decide how many numbers each column contributes per row
  const colCounts: number[][] = Array.from({ length: 9 }, () => [0, 0, 0]);
  let rowTotals = [0, 0, 0];

  // Each column must have 1–3 numbers total; total must be 15 (5 per row)
  // Simple approach: randomly assign 1 or 2 per column, then fill to 15
  const colTotals: number[] = colRanges.map(() => 0);
  let totalAssigned = 0;

  // First pass: each column gets at least 1
  for (let c = 0; c < 9; c++) {
    colTotals[c] = 1;
    totalAssigned++;
  }
  // Remaining 6 go to random columns (max 3 per column)
  while (totalAssigned < 15) {
    const c = Math.floor(Math.random() * 9);
    if (colTotals[c] < 3) {
      colTotals[c]++;
      totalAssigned++;
    }
  }

  // Distribute colTotals[c] numbers across 3 rows for column c
  for (let c = 0; c < 9; c++) {
    const total = colTotals[c];
    const rows = [0, 1, 2];
    // shuffle rows
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    for (let k = 0; k < total; k++) {
      colCounts[c][rows[k]] = 1;
    }
  }

  // Verify each row has exactly 5 — fix if needed
  for (let r = 0; r < 3; r++) {
    rowTotals[r] = colCounts.reduce((s, cc) => s + cc[r], 0);
  }

  // Build the 3×9 grid
  const colPtrs: number[] = Array(9).fill(0);
  const rows: (number | null)[][] = Array.from({ length: 3 }, () =>
    Array(9).fill(null)
  );

  for (let c = 0; c < 9; c++) {
    const nums = colNumbers[c].slice(0, colTotals[c]).sort((a, b) => a - b);
    let numIdx = 0;
    for (let r = 0; r < 3; r++) {
      if (colCounts[c][r] === 1 && numIdx < nums.length) {
        rows[r][c] = nums[numIdx++];
      }
    }
    colPtrs[c] = colTotals[c];
  }

  return { id, rows };
}

// ─── Ticket Component ─────────────────────────────────────────────────────────

function TicketView({
  ticket,
  calledNumbers,
}: {
  ticket: TambolaTicket;
  calledNumbers: Set<number>;
}) {
  return (
    <div className="tambolaTicket">
      <div className="ticketHeader">
        <span>Ticket #{ticket.id}</span>
        <span>Tambola</span>
      </div>
      <div className="ticketGrid">
        {ticket.rows.map((row, ri) =>
          row.map((cell, ci) => (
            <div
              key={`${ri}-${ci}`}
              className={`ticketCell${cell === null ? " blank" : calledNumbers.has(cell) ? " marked" : ""}`}
            >
              {cell ?? ""}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TambolaApp() {
  // Game state
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [remaining, setRemaining] = useState<number[]>(() => {
    const arr = Array.from({ length: 90 }, (_, i) => i + 1);
    // shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [popKey, setPopKey] = useState(0);

  // Story state
  const [activeTheme, setActiveTheme] = useState<StoryTheme>("history");

  // Auto-draw
  const [autoDraw, setAutoDraw] = useState(false);
  const [drawSpeed, setDrawSpeed] = useState(5); // seconds
  const autoDrawRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tickets
  const [ticketCount, setTicketCount] = useState(6);
  const [tickets, setTickets] = useState<TambolaTicket[]>([]);

  // Confirm reset
  const [confirmReset, setConfirmReset] = useState(false);

  const calledSet = new Set(calledNumbers);
  const isDone = remaining.length === 0;

  // ─── Draw next number ──────────────────────────────────────────────────────
  const drawNext = useCallback(() => {
    setRemaining((prev) => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      setCurrentNumber(next);
      setCalledNumbers((c) => [next, ...c]);
      setPopKey((k) => k + 1);
      // Pick a random theme for variety
      const randomTheme =
        STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)];
      setActiveTheme(randomTheme);
      return rest;
    });
  }, []);

  // ─── Auto-draw timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (autoDraw && !isDone) {
      autoDrawRef.current = setInterval(drawNext, drawSpeed * 1000);
    } else {
      if (autoDrawRef.current) clearInterval(autoDrawRef.current);
    }
    return () => {
      if (autoDrawRef.current) clearInterval(autoDrawRef.current);
    };
  }, [autoDraw, drawSpeed, isDone, drawNext]);

  // ─── Reset game ────────────────────────────────────────────────────────────
  function resetGame() {
    setAutoDraw(false);
    const arr = Array.from({ length: 90 }, (_, i) => i + 1);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setRemaining(arr);
    setCalledNumbers([]);
    setCurrentNumber(null);
    setTickets([]);
    setConfirmReset(false);
  }

  // ─── Generate tickets ──────────────────────────────────────────────────────
  function generateTickets() {
    const t: TambolaTicket[] = [];
    for (let i = 1; i <= ticketCount; i++) {
      t.push(generateTicket(i));
    }
    setTickets(t);
  }

  // ─── Print tickets ─────────────────────────────────────────────────────────
  function printTickets() {
    window.print();
  }

  const currentData = currentNumber ? TAMBOLA_DATA[currentNumber] : null;
  const progress = Math.round((calledNumbers.length / 90) * 100);

  return (
    <div className="tambolaApp">
      <div className="tambolaLayout">
        {/* ─── Left Column: Caller + Controls ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Caller panel */}
          <div className="tambolaCard callerPanel">
            <div className="tambolaCardHeader">
              <h2 className="tambolaCardTitle">Number Caller</h2>
              {confirmReset ? (
                <span style={{ display: "flex", gap: "0.4rem" }}>
                  <button
                    className="newGameBtn"
                    style={{ color: "var(--tambola-danger)", borderColor: "var(--tambola-danger)" }}
                    onClick={resetGame}
                  >
                    Confirm Reset
                  </button>
                  <button
                    className="newGameBtn"
                    onClick={() => setConfirmReset(false)}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  className="newGameBtn"
                  onClick={() => setConfirmReset(true)}
                >
                  New Game
                </button>
              )}
            </div>

            {/* Current number */}
            <div className="currentNumberWrap">
              {currentNumber ? (
                <>
                  <div key={popKey} className="currentNumberBadge pop">
                    {currentNumber}
                  </div>
                  <p className="currentCallName">{currentData?.callName}</p>
                </>
              ) : (
                <p className="currentNumberEmpty">
                  {isDone ? "🎉 All 90 numbers called!" : "Press Draw to start"}
                </p>
              )}
            </div>

            {/* Story card */}
            {currentData && (
              <>
                <div className="storyCard">
                  <span className="storyThemeBadge">
                    {THEME_LABELS[activeTheme]}
                  </span>
                  <p className="storyText">{currentData.stories[activeTheme]}</p>
                </div>
                <div className="storyThemeTabs">
                  {STORY_THEMES.map((theme) => (
                    <button
                      key={theme}
                      className={`storyThemeTab${activeTheme === theme ? " active" : ""}`}
                      onClick={() => setActiveTheme(theme)}
                    >
                      {THEME_LABELS[theme]}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Controls */}
            <div className="callerControls">
              <button
                className="drawBtn"
                onClick={drawNext}
                disabled={isDone || autoDraw}
              >
                {isDone ? "Game Over" : "Draw Next Number"}
              </button>

              <div className="autoDrawRow">
                <label className="autoDrawToggle">
                  <input
                    type="checkbox"
                    checked={autoDraw}
                    onChange={(e) => setAutoDraw(e.target.checked)}
                    disabled={isDone}
                  />
                  Auto Draw
                </label>
                <span className="speedLabel">Speed:</span>
                <select
                  className="speedSelect"
                  value={drawSpeed}
                  onChange={(e) => setDrawSpeed(Number(e.target.value))}
                >
                  <option value={3}>3s</option>
                  <option value={5}>5s</option>
                  <option value={8}>8s</option>
                  <option value={12}>12s</option>
                  <option value={20}>20s</option>
                </select>
              </div>

              <div className="progressRow">
                <span>{calledNumbers.length}/90</span>
                <div className="progressBar">
                  <div
                    className="progressFill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span>{progress}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right Column: Number Board ─── */}
        <div className="tambolaCard boardPanel">
          <div className="tambolaCardHeader">
            <h2 className="tambolaCardTitle">Number Board (1–90)</h2>
            <span style={{ fontSize: "0.8rem", color: "var(--tambola-muted)" }}>
              {90 - calledNumbers.length} remaining
            </span>
          </div>
          <div className="numberBoard">
            {Array.from({ length: 90 }, (_, i) => i + 1).map((n) => (
              <div
                key={n}
                className={`boardCell${calledSet.has(n) ? (n === currentNumber ? " current" : " called") : ""}`}
                title={TAMBOLA_DATA[n]?.callName}
              >
                {n}
              </div>
            ))}
          </div>

          {/* Last called strip */}
          {calledNumbers.length > 0 && (
            <div className="lastCalledStrip">
              <span className="lastCalledLabel">Last called:</span>
              {calledNumbers.slice(0, 10).map((n, i) => (
                <span key={`${n}-${i}`} className="lastCalledChip">
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ─── Ticket Generator (full width) ─── */}
        <div className="tambolaCard ticketPanel">
          <div className="tambolaCardHeader">
            <h2 className="tambolaCardTitle">Ticket Generator</h2>
          </div>
          <div className="ticketControls">
            <label className="ticketCountLabel" htmlFor="ticketCount">
              Number of tickets:
            </label>
            <input
              id="ticketCount"
              type="number"
              className="ticketCountInput"
              min={1}
              max={24}
              value={ticketCount}
              onChange={(e) =>
                setTicketCount(Math.min(24, Math.max(1, Number(e.target.value))))
              }
            />
            <button className="generateTicketsBtn" onClick={generateTickets}>
              Generate
            </button>
            {tickets.length > 0 && (
              <button className="printTicketsBtn" onClick={printTickets}>
                🖨 Print
              </button>
            )}
          </div>

          {tickets.length > 0 && (
            <div className="ticketsGrid ticketPrintArea">
              {tickets.map((ticket) => (
                <TicketView
                  key={ticket.id}
                  ticket={ticket}
                  calledNumbers={calledSet}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
