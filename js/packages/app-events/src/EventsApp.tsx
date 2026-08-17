import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./events.css";
import { ApiError, createEvent, demoLogin, getEvent, getToken, listMyEvents, submitRsvp } from "./api";
import type { EventCard, EventDetail, RsvpStatus } from "./types";

const BASE_ROUTE = "/apps/events";

// Hoisted formatters — building Intl objects per render is wasteful.
const DATE_FMT = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "Date TBD" : DATE_FMT.format(d);
}

const STATUS_LABEL: Record<RsvpStatus, string> = { going: "Going", maybe: "Maybe", no: "Can't make it" };

/** Extract the event id from the current path, or null for the host dashboard. */
function routeEventId(): string | null {
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path === BASE_ROUTE || path === "") return null;
  if (path.startsWith(`${BASE_ROUTE}/`)) {
    const rest = path.slice(BASE_ROUTE.length + 1).split("/")[0];
    return rest ? decodeURIComponent(rest) : null;
  }
  return null;
}

export function EventsApp() {
  // The mode is fixed for the lifetime of this mount — the shell does a full
  // navigation (plain <a href>) between routes, so it re-mounts on change.
  const eventId = useMemo(() => routeEventId(), []);
  return eventId ? <EventDetailView eventId={eventId} /> : <HostDashboard />;
}

// ─── Host dashboard ───────────────────────────────────────────────────────────

function HostDashboard() {
  const [events, setEvents] = useState<EventCard[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "signed-out" | "error">("loading");
  const [signingIn, setSigningIn] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const { events } = await listMyEvents();
      setEvents(events);
      setState("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setState("signed-out");
      else setState("error");
    }
  }, []);

  useEffect(() => {
    if (getToken()) void load();
    else setState("signed-out");
  }, [load]);

  const signIn = useCallback(async () => {
    setSigningIn(true);
    try {
      await demoLogin();
      await load();
    } catch {
      setState("error");
    } finally {
      setSigningIn(false);
    }
  }, [load]);

  return (
    <div className="evApp">
      <header className="evHead">
        <h2 className="evTitle">Your events</h2>
        <p className="evLede">Create an event, share the link, and watch RSVPs roll in — no login needed for guests.</p>
      </header>

      {state === "signed-out" && (
        <div className="evNotice">
          <p>Sign in to create and manage your events.</p>
          <button className="evBtn evBtnPrimary" onClick={signIn} disabled={signingIn}>
            {signingIn ? "Signing in…" : "Sign in (demo)"}
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="evNotice">
          <p>Something went wrong loading your events.</p>
          <button className="evBtn" onClick={load}>Try again</button>
        </div>
      )}

      {state === "ready" && (
        <div className="evGrid">
          <CreateEventForm onCreated={(c) => setEvents((prev) => [c, ...prev])} />
          <section className="evListWrap">
            <h3 className="evSubhead">Upcoming ({events.length})</h3>
            {events.length === 0 ? (
              <p className="evEmpty">No events yet. Create your first one on the left.</p>
            ) : (
              <ul className="evList">
                {events.map((e) => (
                  <EventRow key={e.eventId} event={e} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {state === "loading" && <p className="evEmpty">Loading…</p>}
    </div>
  );
}

function CreateEventForm({ onCreated }: { onCreated: (c: EventCard) => void }) {
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("🎉");
  const [startAt, setStartAt] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startAt) {
      setError("A title and start date/time are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const card = await createEvent({ title: title.trim(), emoji: emoji.trim() || "🎉", startAt, location: location.trim(), description: description.trim() });
      onCreated(card);
      setTitle("");
      setEmoji("🎉");
      setStartAt("");
      setLocation("");
      setDescription("");
    } catch {
      setError("Could not create the event. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="evCard evForm" onSubmit={submit}>
      <h3 className="evSubhead">New event</h3>
      <div className="evField evFieldRow">
        <label className="evEmojiField">
          <span className="evLabel">Icon</span>
          <input className="evInput evEmojiInput" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} aria-label="Event icon" />
        </label>
        <label className="evGrow">
          <span className="evLabel">Title</span>
          <input className="evInput" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Block potluck" required />
        </label>
      </div>
      <label className="evField">
        <span className="evLabel">When</span>
        <input className="evInput" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
      </label>
      <label className="evField">
        <span className="evLabel">Where</span>
        <input className="evInput" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Crossroads Park" />
      </label>
      <label className="evField">
        <span className="evLabel">Details</span>
        <textarea className="evInput evTextarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What to bring, parking, etc." rows={3} />
      </label>
      {error && <p className="evError">{error}</p>}
      <button className="evBtn evBtnPrimary" type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create event"}
      </button>
    </form>
  );
}

function EventRow({ event }: { event: EventCard }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}${BASE_ROUTE}/${event.eventId}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — link is still visible via the View button */
    }
  };

  return (
    <li className="evRow">
      <span className="evRowIcon" aria-hidden="true">{event.emoji}</span>
      <div className="evRowBody">
        <a className="evRowTitle" href={`${BASE_ROUTE}/${event.eventId}`}>{event.title}</a>
        <span className="evRowMeta">{formatWhen(event.startAt)}{event.location ? ` · ${event.location}` : ""}</span>
        <span className="evRowStats">{event.going} going · {event.headcount} attending</span>
      </div>
      <div className="evRowActions">
        <a className="evBtn evBtnSm" href={`${BASE_ROUTE}/${event.eventId}`}>Open</a>
        <button className="evBtn evBtnSm" onClick={copy}>{copied ? "Copied!" : "Copy link"}</button>
      </div>
    </li>
  );
}

// ─── Public event page ────────────────────────────────────────────────────────

function EventDetailView({ eventId }: { eventId: string }) {
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "not-found" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setDetail(await getEvent(eventId));
      setState("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setState("not-found");
      else setState("error");
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "loading") return <div className="evApp"><p className="evEmpty">Loading…</p></div>;
  if (state === "not-found")
    return (
      <div className="evApp">
        <div className="evNotice">
          <p>That event doesn't exist or the link has expired.</p>
          <a className="evBtn" href={BASE_ROUTE}>← Your events</a>
        </div>
      </div>
    );
  if (state === "error" || !detail)
    return (
      <div className="evApp">
        <div className="evNotice">
          <p>Something went wrong loading this event.</p>
          <button className="evBtn" onClick={load}>Try again</button>
        </div>
      </div>
    );

  return (
    <div className="evApp">
      <a className="evBack" href={BASE_ROUTE}>← Your events</a>
      <header className="evDetailHead">
        <span className="evDetailIcon" aria-hidden="true">{detail.emoji}</span>
        <div>
          <h2 className="evTitle">{detail.title}</h2>
          <p className="evLede">Hosted by {detail.hostName}</p>
        </div>
      </header>

      <dl className="evFacts">
        <div><dt>When</dt><dd>{formatWhen(detail.startAt)}</dd></div>
        {detail.location && <div><dt>Where</dt><dd>{detail.location}</dd></div>}
      </dl>
      {detail.description && <p className="evDescription">{detail.description}</p>}

      <div className="evSummary">
        <span className="evChip evChipGoing">{detail.summary.going} going</span>
        <span className="evChip">{detail.summary.maybe} maybe</span>
        <span className="evChip evChipHead">{detail.summary.headcount} attending</span>
      </div>

      <RsvpForm eventId={eventId} onUpdated={setDetail} />

      <section className="evGuestsWrap">
        <h3 className="evSubhead">Who's coming</h3>
        {detail.guests.length === 0 ? (
          <p className="evEmpty">No RSVPs yet — be the first!</p>
        ) : (
          <ul className="evGuests">
            {detail.guests.map((g, i) => (
              <li className="evGuest" key={`${g.name}-${i}`}>
                <span className={`evStatusDot evStatus-${g.status}`} aria-hidden="true" />
                <span className="evGuestName">{g.name}{g.guests > 0 ? ` +${g.guests}` : ""}</span>
                <span className="evGuestStatus">{STATUS_LABEL[g.status]}</span>
                {g.note && <span className="evGuestNote">“{g.note}”</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RsvpForm({ eventId, onUpdated }: { eventId: string; onUpdated: (d: EventDetail) => void }) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<RsvpStatus>("going");
  const [guests, setGuests] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const doneTimer = useRef<number | null>(null);

  useEffect(() => () => { if (doneTimer.current !== null) window.clearTimeout(doneTimer.current); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const updated = await submitRsvp(eventId, { name: name.trim(), status, guests, note: note.trim() });
      onUpdated(updated);
      setDone(true);
      if (doneTimer.current !== null) window.clearTimeout(doneTimer.current);
      doneTimer.current = window.setTimeout(() => setDone(false), 2400);
    } catch {
      setError("Could not save your RSVP. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="evCard evForm evRsvp" onSubmit={submit}>
      <h3 className="evSubhead">Your RSVP</h3>
      <label className="evField">
        <span className="evLabel">Name</span>
        <input className="evInput" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
      </label>
      <div className="evField">
        <span className="evLabel">Are you coming?</span>
        <div className="evStatusPick" role="radiogroup" aria-label="RSVP status">
          {(["going", "maybe", "no"] as RsvpStatus[]).map((s) => (
            <button
              type="button"
              key={s}
              className={`evStatusBtn${status === s ? " isActive" : ""}`}
              role="radio"
              aria-checked={status === s}
              onClick={() => setStatus(s)}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      <div className="evField evFieldRow">
        <label className="evGrow">
          <span className="evLabel">Extra guests</span>
          <input
            className="evInput"
            type="number"
            min={0}
            max={20}
            value={guests}
            onChange={(e) => setGuests(Math.max(0, Math.min(20, Math.round(Number(e.target.value)) || 0)))}
          />
        </label>
      </div>
      <label className="evField">
        <span className="evLabel">Note (optional)</span>
        <input className="evInput" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bringing dessert!" />
      </label>
      {error && <p className="evError">{error}</p>}
      <button className="evBtn evBtnPrimary" type="submit" disabled={busy}>
        {busy ? "Saving…" : done ? "Saved ✓" : "Send RSVP"}
      </button>
    </form>
  );
}
