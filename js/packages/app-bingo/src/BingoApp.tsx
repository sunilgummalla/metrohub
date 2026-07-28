import { useState, useEffect, useRef, useCallback } from "react";
import {
  BINGO_DATA,
  BINGO_COLUMNS,
  STORY_THEMES,
  THEME_LABELS,
  type NumberStories,
} from "./bingo-data";
import "./bingo.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type StoryTheme = keyof NumberStories;

interface BingoCard {
  id: number;
  // 5 columns (B,I,N,G,O), 5 rows each
  columns: (number | "FREE")[][];
}

// ─── Bingo Card Generator ─────────────────────────────────────────────────────
// Standard Bingo card: 5×5 grid, FREE center (row 2, col 2)
// B: 1-15 (5 numbers), I: 16-30 (5), N: 31-45 (4+FREE), G: 46-60 (5), O: 61-75 (5)

const COL_KEYS = ["B", "I", "N", "G", "O"] as const;

function generateBingoCard(id: number): BingoCard {
  const columns: (number | "FREE")[][] = COL_KEYS.map((col) => {
    const [lo, hi] = BINGO_COLUMNS[col];
    const pool: number[] = [];
    for (let n = lo; n <= hi; n++) pool.push(n);
    // shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 5);
  });

  // Place FREE in center: column N (index 2), row 2 (0-indexed)
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
        {/* Render row by row */}
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

// ─── Helper: get BINGO column letter for a number ─────────────────────────────

function getColumnLetter(n: number): string {
  if (n >= 1 && n <= 15) return "B";
  if (n >= 16 && n <= 30) return "I";
  if (n >= 31 && n <= 45) return "N";
  if (n >= 46 && n <= 60) return "G";
  return "O";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BingoApp() {
  // Game state
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [remaining, setRemaining] = useState<number[]>(() => {
    const arr = Array.from({ length: 75 }, (_, i) => i + 1);
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
  const [drawSpeed, setDrawSpeed] = useState(5);
  const autoDrawRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cards
  const [cardCount, setCardCount] = useState(6);
  const [cards, setCards] = useState<BingoCard[]>([]);

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
    const arr = Array.from({ length: 75 }, (_, i) => i + 1);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setRemaining(arr);
    setCalledNumbers([]);
    setCurrentNumber(null);
    setCards([]);
    setConfirmReset(false);
  }

  // ─── Generate cards ────────────────────────────────────────────────────────
  function generateCards() {
    const c: BingoCard[] = [];
    for (let i = 1; i <= cardCount; i++) {
      c.push(generateBingoCard(i));
    }
    setCards(c);
  }

  // ─── Print cards ───────────────────────────────────────────────────────────
  function printCards() {
    window.print();
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
              <h2 className="bingoCardTitle">Number Caller</h2>
              {confirmReset ? (
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
                  {isDone ? "🎉 All 75 numbers called!" : "Press Draw to start"}
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

            {/* Controls */}
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
          </div>
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
              {/* Render 15 rows × 5 columns */}
              {Array.from({ length: 15 }, (_, row) =>
                COL_KEYS.map((col, colIdx) => {
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

        {/* ─── Bingo Card Generator (full width) ─── */}
        <div className="bingoCard bingoTicketPanel">
          <div className="bingoCardHeader">
            <h2 className="bingoCardTitle">Bingo Card Generator</h2>
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
            {cards.length > 0 && (
              <button className="bingoPrintBtn" onClick={printCards}>
                🖨 Print
              </button>
            )}
          </div>

          {cards.length > 0 && (
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
      </div>
    </div>
  );
}
