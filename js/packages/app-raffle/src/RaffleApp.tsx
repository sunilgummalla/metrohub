import { useEffect, useMemo, useRef, useState } from "react";
import "./raffle.css";

interface Entrant {
  id: string;
  name: string;
  tickets: number;
}
interface Winner {
  name: string;
  prize: string;
}
interface Saved {
  title: string;
  prize: string;
  entrants: Entrant[];
  winners: Winner[];
  excludeWinners: boolean;
}

const STORAGE_KEY = "mh-raffle-v1";

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

/** Weighted random pick — each entrant's ticket count is its weight. */
function weightedPick(pool: Entrant[]): Entrant | null {
  const total = pool.reduce((s, e) => s + Math.max(0, e.tickets), 0);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const e of pool) {
    r -= Math.max(0, e.tickets);
    if (r < 0) return e;
  }
  return pool[pool.length - 1];
}

export function RaffleApp() {
  const saved = useRef<Saved | null>(load()).current;
  const [title, setTitle] = useState(saved?.title ?? "Friday Night Raffle");
  const [prize, setPrize] = useState(saved?.prize ?? "Grand Prize");
  const [entrants, setEntrants] = useState<Entrant[]>(saved?.entrants ?? []);
  const [winners, setWinners] = useState<Winner[]>(saved?.winners ?? []);
  const [excludeWinners, setExcludeWinners] = useState(saved?.excludeWinners ?? true);

  const [newName, setNewName] = useState("");
  const [newTickets, setNewTickets] = useState(1);

  const [drawing, setDrawing] = useState(false);
  const [rolling, setRolling] = useState<string | null>(null);
  const [latest, setLatest] = useState<Winner | null>(null);
  const rollTimer = useRef<number | null>(null);
  const idRef = useRef(saved?.entrants?.length ? saved.entrants.length + 1 : 1);

  // Persist on change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ title, prize, entrants, winners, excludeWinners }));
    } catch {
      /* storage unavailable — non-fatal */
    }
  }, [title, prize, entrants, winners, excludeWinners]);

  // Clean up the roll animation on unmount.
  useEffect(() => () => { if (rollTimer.current) window.clearInterval(rollTimer.current); }, []);

  const totalTickets = useMemo(() => entrants.reduce((s, e) => s + e.tickets, 0), [entrants]);
  const wonNames = useMemo(() => new Set(winners.map((w) => w.name)), [winners]);
  const pool = useMemo(
    () => (excludeWinners ? entrants.filter((e) => !wonNames.has(e.name)) : entrants),
    [entrants, excludeWinners, wonNames],
  );
  const poolTickets = pool.reduce((s, e) => s + e.tickets, 0);

  function addEntrant() {
    const name = newName.trim();
    if (!name) return;
    const tickets = Math.max(1, Math.round(newTickets) || 1);
    const existing = entrants.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setEntrants((es) => es.map((e) => (e.id === existing.id ? { ...e, tickets: e.tickets + tickets } : e)));
    } else {
      setEntrants((es) => [...es, { id: `e${idRef.current++}`, name, tickets }]);
    }
    setNewName("");
    setNewTickets(1);
  }

  function removeEntrant(id: string) {
    setEntrants((es) => es.filter((e) => e.id !== id));
  }

  function draw() {
    if (drawing || pool.length === 0) return;
    setLatest(null);
    setDrawing(true);
    let ticks = 0;
    rollTimer.current = window.setInterval(() => {
      setRolling(pool[Math.floor(Math.random() * pool.length)].name);
      ticks++;
      if (ticks >= 16) {
        if (rollTimer.current) window.clearInterval(rollTimer.current);
        const w = weightedPick(pool);
        setRolling(null);
        setDrawing(false);
        if (w) {
          const winner: Winner = { name: w.name, prize: prize.trim() || "Prize" };
          setLatest(winner);
          setWinners((ws) => [winner, ...ws]);
        }
      }
    }, 80);
  }

  function resetWinners() {
    setWinners([]);
    setLatest(null);
  }
  function clearAll() {
    setEntrants([]);
    setWinners([]);
    setLatest(null);
  }

  return (
    <div className="rfApp">
      <div className="rfGrid">
        {/* ══ LEFT: setup + entrants ══ */}
        <div className="rfCol">
          <section className="rfCard">
            <h3 className="rfH3">Raffle</h3>
            <label className="rfField">
              <span className="rfLabel">Title</span>
              <input className="rfInput" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Raffle title" />
            </label>
            <label className="rfField">
              <span className="rfLabel">Prize</span>
              <input className="rfInput" value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="What's being won" />
            </label>
          </section>

          <section className="rfCard">
            <div className="rfPh">
              <h3 className="rfH3">Entrants</h3>
              <span className="rfPhr">{entrants.length} people · {totalTickets} tickets</span>
            </div>

            <form
              className="rfAdd"
              onSubmit={(e) => { e.preventDefault(); addEntrant(); }}
            >
              <input
                className="rfInput rfAddName" value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name" aria-label="Entrant name"
              />
              <div className="rfTicketBox">
                <input
                  className="rfInput rfAddTickets" type="number" min={1} value={newTickets}
                  onChange={(e) => setNewTickets(Math.max(1, Number(e.target.value) || 1))}
                  aria-label="Ticket count"
                />
                <span className="rfTix">🎟️</span>
              </div>
              <button className="rfBtn rfBtnFill" type="submit">Add</button>
            </form>

            {entrants.length === 0 ? (
              <p className="rfEmpty">Add people above — each ticket is one chance to win.</p>
            ) : (
              <ul className="rfList">
                {entrants.map((e) => {
                  const odds = totalTickets > 0 ? (e.tickets / totalTickets) * 100 : 0;
                  const won = wonNames.has(e.name);
                  return (
                    <li key={e.id} className={`rfRow ${won ? "rfWon" : ""}`}>
                      <span className="rfName">{e.name}{won && <span className="rfWonTag">won</span>}</span>
                      <span className="rfOdds">{odds.toFixed(1)}%</span>
                      <span className="rfTickets">{e.tickets} 🎟️</span>
                      <button className="rfX" type="button" onClick={() => removeEntrant(e.id)} aria-label={`Remove ${e.name}`}>×</button>
                    </li>
                  );
                })}
              </ul>
            )}

            {entrants.length > 0 && (
              <button className="rfLink" type="button" onClick={clearAll}>Clear all entrants</button>
            )}
          </section>
        </div>

        {/* ══ RIGHT: draw ══ */}
        <div className="rfCol">
          <section className="rfCard rfStage">
            <span className="rfStageTitle">{title || "Raffle"}</span>
            <div className={`rfReveal ${drawing ? "rfRolling" : latest ? "rfWinner" : ""}`}>
              {drawing ? (
                <span className="rfRollName">{rolling ?? "…"}</span>
              ) : latest ? (
                <>
                  <span className="rfConfetti" aria-hidden="true">🎉</span>
                  <span className="rfWinnerName">{latest.name}</span>
                  <span className="rfWinnerPrize">wins {latest.prize}</span>
                </>
              ) : (
                <span className="rfPlaceholder">Ready to draw</span>
              )}
            </div>

            <button
              className="rfBtn rfDraw" type="button"
              onClick={draw} disabled={drawing || pool.length === 0}
            >
              {drawing ? "Drawing…" : latest ? "Draw again" : "Draw winner"}
            </button>

            <label className="rfCheck">
              <input type="checkbox" checked={excludeWinners} onChange={(e) => setExcludeWinners(e.target.checked)} />
              Exclude previous winners
            </label>
            <span className="rfPoolNote">
              {pool.length > 0
                ? `${pool.length} eligible · ${poolTickets} tickets in the draw`
                : entrants.length === 0 ? "Add entrants to start" : "Everyone eligible has won"}
            </span>
          </section>

          {winners.length > 0 && (
            <section className="rfCard">
              <div className="rfPh">
                <h3 className="rfH3">Winners</h3>
                <button className="rfLink" type="button" onClick={resetWinners}>Reset</button>
              </div>
              <ol className="rfWinners">
                {winners.map((w, i) => (
                  <li key={`${w.name}-${i}`} className="rfWinnerRow">
                    <span className="rfMedal">{i === 0 ? "🏆" : "🎗️"}</span>
                    <span className="rfWinnerRowName">{w.name}</span>
                    <span className="rfWinnerRowPrize">{w.prize}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
