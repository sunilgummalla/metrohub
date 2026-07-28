import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  BINGO_DATA,
  BINGO_COLUMNS,
  STORY_THEMES,
  THEME_LABELS,
  type NumberStories,
} from "./bingo-data";
import { useGameSync, type GameSyncPayload } from "./useGameSync";
import "./bingo.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type StoryTheme = keyof NumberStories;

interface BingoCard {
  id: number;
  columns: (number | "FREE")[][];
}

interface BingoGameState {
  calledNumbers: number[];
  remaining: number[];
  currentNumber: number | null;
  savedAt: number;
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = "bingo-active-v1";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function freshRemaining(): number[] {
  const arr = Array.from({ length: 75 }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function freshState(): BingoGameState {
  return {
    calledNumbers: [],
    remaining: freshRemaining(),
    currentNumber: null,
    savedAt: Date.now(),
  };
}

/** Load state from localStorage (host only; read-only viewers start fresh and receive via SSE) */
function loadState(isReadOnly: boolean): BingoGameState {
  if (isReadOnly) return freshState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BingoGameState;
      if (parsed && typeof parsed.savedAt === "number") {
        if (Date.now() - parsed.savedAt < TTL_MS) return parsed;
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch { /* ignore */ }
  return freshState();
}

function saveState(state: BingoGameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch { /* ignore */ }
}

// ─── Bingo Card Generator ─────────────────────────────────────────────────────

const COL_KEYS = ["B", "I", "N", "G", "O"] as const;

function generateBingoCard(id: number): BingoCard {
  const columns: (number | "FREE")[][] = COL_KEYS.map((col) => {
    const [lo, hi] = BINGO_COLUMNS[col];
    const pool: number[] = [];
    for (let n = lo; n <= hi; n++) pool.push(n);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 5);
  });
  columns[2][2] = "FREE";
  return { id, columns };
}

// ─── Bingo Card Component ─────────────────────────────────────────────────────

function BingoCardView({
  card,
  calledNumbers,
}: {
  card: BingoCard;
  calledNumbers: Set<number>;
}) {
  return (
    <div className="bingoCard5x5">
      <div className="bingoCard5x5Header">
        {COL_KEYS.map((col) => (
          <div key={col} className="bingoCard5x5ColLabel">
            {col}
          </div>
        ))}
      </div>
      <div className="bingoCard5x5Grid">
        {Array.from({ length: 5 }, (_, row) =>
          COL_KEYS.map((_, colIdx) => {
            const cell = card.columns[colIdx][row];
            const isFree = cell === "FREE";
            const isMarked = !isFree && calledNumbers.has(cell as number);
            return (
              <div
                key={`${row}-${colIdx}`}
                className={`bingoCard5x5Cell${isFree ? " free" : isMarked ? " marked" : ""}`}
              >
                {isFree ? "FREE" : cell}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Copy Link Button ─────────────────────────────────────────────────────────

function CopyLinkBtn({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      window.open(url, "_blank");
    });
  }

  return (
    <button
      className={`bingoShareBtn${copied ? " bingoShareBtnCopied" : ""}`}
      type="button"
      onClick={handleCopy}
    >
      {copied ? "✓ Link copied!" : "Copy read-only link"}
    </button>
  );
}

// ─── Helper: get BINGO column letter ─────────────────────────────────────────

function getColumnLetter(n: number): string {
  if (n >= 1 && n <= 15) return "B";
  if (n >= 16 && n <= 30) return "I";
  if (n >= 31 && n <= 45) return "N";
  if (n >= 46 && n <= 60) return "G";
  return "O";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BingoApp() {
  // ─── SSE sync (host publishes, read-only viewer subscribes) ───────────────
  const onRemoteUpdate = useCallback((remote: GameSyncPayload) => {
    setGameState((prev) => {
      const calledNumbers = Array.isArray(remote.calledNumbers) ? remote.calledNumbers : prev.calledNumbers;
      const changed = prev.calledNumbers.length !== calledNumbers.length;
      if (changed) {
        setPopKey((k) => k + 1);
        setActiveTheme(STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)]);
      }
      return {
        calledNumbers,
        remaining: prev.remaining,
        currentNumber: remote.currentNumber !== undefined ? remote.currentNumber : prev.currentNumber,
        savedAt: Date.now(),
      };
    });
  }, []);

  const { isReadOnly, shareUrl, publish, resetGameId } = useGameSync({
    gameType: "bingo",
    onRemoteUpdate,
  });

  // Load persisted state (host only; read-only starts fresh and receives via SSE)
  const [gameState, setGameState] = useState<BingoGameState>(() => loadState(isReadOnly));

  const { calledNumbers, remaining, currentNumber } = gameState;

  // Pop animation key
  const [popKey, setPopKey] = useState(0);

  // Story state
  const [activeTheme, setActiveTheme] = useState<StoryTheme>("history");

  // Auto-draw
  const [autoDraw, setAutoDraw] = useState(false);
  const [drawSpeed, setDrawSpeed] = useState(5);
  const autoDrawRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cards
  const [cardCount, setCardCount] = useState(6);
  const [cards, setCards] = useState<BingoCard[]>([]);
  const [cardsVisible, setCardsVisible] = useState(false);

  // Confirm reset
  const [confirmReset, setConfirmReset] = useState(false);

  const calledSet = new Set(calledNumbers);
  const isDone = remaining.length === 0;

  // ─── Persist every state change and publish to SSE (host only) ────────────
  useEffect(() => {
    if (!isReadOnly) {
      saveState(gameState);
      publish({ calledNumbers, currentNumber, remaining: remaining.length });
    }
  }, [gameState, isReadOnly, publish, calledNumbers, currentNumber, remaining]);

  // ─── Draw next number ──────────────────────────────────────────────────────
  const drawNext = useCallback(() => {
    setGameState((prev) => {
      if (prev.remaining.length === 0) return prev;
      const [next, ...rest] = prev.remaining;
      setPopKey((k) => k + 1);
      const randomTheme = STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)];
      setActiveTheme(randomTheme);
      return {
        calledNumbers: [next, ...prev.calledNumbers],
        remaining: rest,
        currentNumber: next,
        savedAt: Date.now(),
      };
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
    setCards([]);
    setCardsVisible(false);
    setConfirmReset(false);
    setGameState(freshState());
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    resetGameId(); // new session UUID — old share links go stale
  }

  // ─── Generate cards ────────────────────────────────────────────────────────
  function generateCards() {
    const c: BingoCard[] = [];
    for (let i = 1; i <= cardCount; i++) {
      c.push(generateBingoCard(i));
    }
    setCards(c);
    setCardsVisible(true);
  }

  // ─── Custom print renderer ──────────────────────────────────────────────────
  function printCards() {
    const cardHtml = cards
      .map((card) => {
        const rowsHtml = Array.from({ length: 5 }, (_, row) => {
          const cells = COL_KEYS.map((_, colIdx) => {
            const cell = card.columns[colIdx][row];
            const isFree = cell === "FREE";
            const isMarked = !isFree && calledSet.has(cell as number);
            const bg = isFree ? "#f59e0b" : isMarked ? "#0f766e" : "#f0fdf4";
            const color = isFree || isMarked ? "#fff" : "#475569";
            const fontSize = isFree ? "9px" : "13px";
            return `<td style="width:40px;height:40px;text-align:center;vertical-align:middle;border:1px solid #d1fae5;font-size:${fontSize};font-weight:700;background:${bg};color:${color};">${isFree ? "FREE" : cell}</td>`;
          }).join("");
          return `<tr>${cells}</tr>`;
        }).join("");
        const headerCells = COL_KEYS.map(
          (col) =>
            `<td style="width:40px;height:28px;text-align:center;vertical-align:middle;background:#0f766e;color:#fff;font-size:14px;font-weight:800;">${col}</td>`
        ).join("");
        return `<div style="display:inline-block;margin:8px;border:2px solid #0f766e;border-radius:8px;overflow:hidden;break-inside:avoid;page-break-inside:avoid;">
          <table style="border-collapse:collapse;">
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>`;
      })
      .join("");

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bingo Cards</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #fff; padding: 16px; }
    h2 { font-size: 16px; color: #0f766e; margin-bottom: 12px; }
    .cards-wrap { display: flex; flex-wrap: wrap; gap: 0; }
    @media print {
      body { padding: 8px; }
      h2 { display: none; }
      .no-print { display: none !important; }
      .cards-wrap { display: grid; grid-template-columns: repeat(3, auto); gap: 6px; }
    }
    .no-print { margin-bottom: 14px; }
    button { padding: 8px 20px; background: #0f766e; color: #fff; border: none;
             border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; margin-right: 8px; }
    button.cancel { background: #f1f5f9; color: #475569; }
  </style>
</head>
<body>
  <div class="no-print">
    <h2>Bingo Cards — ${cards.length} card${cards.length > 1 ? "s" : ""}</h2>
    <button onclick="window.print()">🖨 Print</button>
    <button class="cancel" onclick="window.close()">Close</button>
  </div>
  <div class="cards-wrap">${cardHtml}</div>
</body>
</html>`);
    printWindow.document.close();
  }

  const currentData = currentNumber ? BINGO_DATA[currentNumber] : null;
  const currentCol = currentNumber ? getColumnLetter(currentNumber) : null;
  const progress = Math.round((calledNumbers.length / 75) * 100);

  return (
    <div className="bingoApp">
      <div className="bingoLayout">
        {/* ─── Left Column: Caller + Controls ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="bingoCard bingoCallerPanel">
            <div className="bingoCardHeader">
              <h2 className="bingoCardTitle">
                Number Caller
                {isReadOnly && (
                  <span className="bingoReadOnlyBadge">View only</span>
                )}
              </h2>
              {!isReadOnly && (
                confirmReset ? (
                  <span style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      className="bingoNewGameBtn"
                      style={{ color: "var(--bingo-danger)", borderColor: "var(--bingo-danger)" }}
                      onClick={resetGame}
                    >
                      Confirm Reset
                    </button>
                    <button
                      className="bingoNewGameBtn"
                      onClick={() => setConfirmReset(false)}
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    className="bingoNewGameBtn"
                    onClick={() => setConfirmReset(true)}
                  >
                    New Game
                  </button>
                )
              )}
            </div>

            {/* Current number */}
            <div className="bingoCurrentNumberWrap">
              {currentNumber ? (
                <>
                  {currentCol && (
                    <span className="bingoColumnBadge">{currentCol}</span>
                  )}
                  <div key={popKey} className="bingoCurrentNumberBadge pop">
                    {currentNumber}
                  </div>
                  <p className="bingoCurrentCallName">{currentData?.callName}</p>
                </>
              ) : (
                <p className="bingoCurrentNumberEmpty">
                  {isDone
                    ? "🎉 All 75 numbers called!"
                    : isReadOnly
                    ? "Waiting for host to draw…"
                    : "Press Draw to start"}
                </p>
              )}
            </div>

            {/* Story card */}
            {currentData && (
              <>
                <div className="bingoStoryCard">
                  <span className="bingoStoryThemeBadge">
                    {THEME_LABELS[activeTheme]}
                  </span>
                  <p className="bingoStoryText">
                    {currentData.stories[activeTheme]}
                  </p>
                </div>
                <div className="bingoStoryThemeTabs">
                  {STORY_THEMES.map((theme) => (
                    <button
                      key={theme}
                      className={`bingoStoryThemeTab${activeTheme === theme ? " active" : ""}`}
                      onClick={() => setActiveTheme(theme)}
                    >
                      {THEME_LABELS[theme]}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Controls — hidden for read-only viewers */}
            {!isReadOnly && (
              <div className="bingoCallerControls">
                <button
                  className="bingoDrawBtn"
                  onClick={drawNext}
                  disabled={isDone || autoDraw}
                >
                  {isDone ? "Game Over" : "Draw Next Number"}
                </button>

                <div className="bingoAutoDrawRow">
                  <label className="bingoAutoDrawToggle">
                    <input
                      type="checkbox"
                      checked={autoDraw}
                      onChange={(e) => setAutoDraw(e.target.checked)}
                      disabled={isDone}
                    />
                    Auto Draw
                  </label>
                  <span className="bingoSpeedLabel">Speed:</span>
                  <select
                    className="bingoSpeedSelect"
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

                <div className="bingoProgressRow">
                  <span>{calledNumbers.length}/75</span>
                  <div className="bingoProgressBar">
                    <div
                      className="bingoProgressFill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span>{progress}%</span>
                </div>
              </div>
            )}

            {/* Progress row for read-only viewers */}
            {isReadOnly && (
              <div className="bingoCallerControls">
                <div className="bingoProgressRow">
                  <span>{calledNumbers.length}/75</span>
                  <div className="bingoProgressBar">
                    <div
                      className="bingoProgressFill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span>{progress}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Share panel — only for host (non-read-only) */}
          {!isReadOnly && (
            <div className="bingoCard bingoSharePanel">
              <div className="bingoCardHeader">
                <h2 className="bingoCardTitle">Share Game</h2>
              </div>
              <div className="bingoShareBody">
                <p className="bingoShareDesc">
                  Share this read-only link with players. It updates live as numbers are drawn.
                </p>
                <CopyLinkBtn url={shareUrl} />
              </div>
            </div>
          )}
        </div>

        {/* ─── Right Column: Number Board (5×15 BINGO layout) ─── */}
        <div className="bingoCard bingoBoardPanel">
          <div className="bingoCardHeader">
            <h2 className="bingoCardTitle">Number Board (1–75)</h2>
            <span style={{ fontSize: "0.8rem", color: "var(--bingo-muted)" }}>
              {75 - calledNumbers.length} remaining
            </span>
          </div>
          <div className="bingoBoard">
            <div className="bingoBoardHeader">
              {COL_KEYS.map((col) => (
                <div key={col} className="bingoBoardColLabel">
                  {col}
                </div>
              ))}
            </div>
            <div className="bingoBoardGrid">
              {Array.from({ length: 15 }, (_, row) =>
                COL_KEYS.map((col) => {
                  const [lo] = BINGO_COLUMNS[col];
                  const n = lo + row;
                  const isCalled = calledSet.has(n);
                  const isCurrent = n === currentNumber;
                  return (
                    <div
                      key={`${col}-${row}`}
                      className={`bingoBoardCell${isCalled ? (isCurrent ? " current" : " called") : ""}`}
                      title={BINGO_DATA[n]?.callName}
                    >
                      {n}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Last called strip */}
          {calledNumbers.length > 0 && (
            <div className="bingoLastCalledStrip">
              <span className="bingoLastCalledLabel">Last called:</span>
              {calledNumbers.slice(0, 10).map((n, i) => (
                <span key={`${n}-${i}`} className="bingoLastCalledChip">
                  {getColumnLetter(n)}{n}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ─── Bingo Card Generator (full width) — hidden for read-only ─── */}
        {!isReadOnly && (
          <div className="bingoCard bingoTicketPanel">
            <div className="bingoCardHeader">
              <h2 className="bingoCardTitle">Bingo Card Generator</h2>
              {cardsVisible && cards.length > 0 && (
                <button
                  className="bingoCloseCardsBtn"
                  onClick={() => setCardsVisible(false)}
                  title="Hide cards"
                >
                  ✕ Close
                </button>
              )}
            </div>
            <div className="bingoTicketControls">
              <label className="bingoTicketCountLabel" htmlFor="bingoCardCount">
                Number of cards:
              </label>
              <input
                id="bingoCardCount"
                type="number"
                className="bingoTicketCountInput"
                min={1}
                max={24}
                value={cardCount}
                onChange={(e) =>
                  setCardCount(Math.min(24, Math.max(1, Number(e.target.value))))
                }
              />
              <button className="bingoGenerateBtn" onClick={generateCards}>
                Generate
              </button>
              {cardsVisible && cards.length > 0 && (
                <button className="bingoPrintBtn" onClick={printCards}>
                  🖨 Print
                </button>
              )}
            </div>

            {cardsVisible && cards.length > 0 && (
              <div className="bingoTicketsGrid bingoPrintArea">
                {cards.map((card) => (
                  <BingoCardView
                    key={card.id}
                    card={card}
                    calledNumbers={calledSet}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
