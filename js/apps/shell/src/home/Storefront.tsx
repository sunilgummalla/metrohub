import { useEffect, useMemo, useState } from "react";
import { apiGet, money } from "./api";
import { TopNav } from "./TopNav";
import type { Activity, ActivityItem, Landing, VendorCard } from "./types";

const ROT_WORDS = ["game night", "local deal", "shared bill", "block party"];

/** Compact relative time for the live feed ("just now", "4m ago", "2h ago"). */
function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function LiveRow({ it, dup = false }: { it: ActivityItem; dup?: boolean }) {
  return (
    <a className={`sfLiveItem sfLive-${it.kind}`} href={it.href} tabIndex={dup ? -1 : undefined}>
      <div className="sfLiveTop">
        <span className="sfLiveSrc">{it.source}</span>
        <span className="sfLiveBadge">{it.badge}</span>
      </div>
      <div className="sfLiveMsg">{it.title}</div>
      <div className="sfLiveAgo">{relTime(it.at)}</div>
    </a>
  );
}

/** Right-hand streaming rail of real neighborhood activity. */
function LiveFeed({ items }: { items: ActivityItem[] }) {
  // Duplicate the list so the marquee can loop seamlessly. The second copy is
  // hidden from assistive tech and taken out of the tab order. When there's
  // little to show — or reduced motion — CSS drops the animation and the
  // viewport just scrolls.
  const marquee = items.length >= 6;
  return (
    <aside className="sfLive" aria-label="Live neighborhood activity">
      <div className="sfLiveHd">
        <span className="sfLiveTitle">Live feed</span>
        <span className="sfLiveNow"><i className="sfPulse" aria-hidden="true" /> Now</span>
      </div>
      <div className={`sfLiveViewport${marquee ? " sfLiveScroll" : ""}`}>
        <div className="sfLiveTrack">
          {items.map((it) => <LiveRow key={it.id} it={it} />)}
          {marquee && (
            <div className="sfLiveDup" aria-hidden="true">
              {items.map((it) => <LiveRow key={`dup-${it.id}`} it={it} dup />)}
            </div>
          )}
        </div>
      </div>
      <div className="sfLiveFt">
        <span className="sfLiveDot" aria-hidden="true" /> Updated live · neighborhood activity
      </div>
    </aside>
  );
}

function stars(rating: number | null): string {
  if (rating == null) return "";
  // Ratings come from flexible categoryData — clamp to [0, 5] so out-of-range
  // values can't produce negative/overflowing slices.
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
}

const CATEGORY_ICON: Record<string, string> = {
  Grocer: "🛒", Café: "☕", Events: "🎉", Florist: "💐", Restaurant: "🍛",
};

function VendorTile({ v }: { v: VendorCard }) {
  return (
    <a className="sfBiz" href="/marketplace">
      <div className="sfBizTop">{CATEGORY_ICON[v.category] ?? "🏪"}</div>
      <div className="sfBizBody">
        <h4>{v.name}</h4>
        <div className="sfBizCat">{v.category}</div>
        <div className="sfBizRow">
          {v.rating != null && <span className="sfStars" aria-hidden="true">{stars(v.rating)}</span>}
          {v.rating != null && <span>{v.rating.toFixed(1)}</span>}
          {v.open != null && (
            <span className={`sfOpen ${v.open ? "" : "sfClosed"}`}>{v.open ? "Open" : "Closed"}</span>
          )}
        </div>
      </div>
    </a>
  );
}

export function Storefront({ onSignIn }: { onSignIn: () => void }) {
  const [data, setData] = useState<Landing | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [error, setError] = useState(false);
  const [rot, setRot] = useState(0);

  useEffect(() => {
    let alive = true;
    apiGet<Landing>("/api/home/landing")
      .then((d) => { if (alive) setData(d); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, []);

  // Live feed: fetch now, then refresh every 60s so the rail (and its relative
  // timestamps) stays current while the storefront is open.
  useEffect(() => {
    let alive = true;
    const pull = () =>
      apiGet<Activity>("/api/home/activity")
        .then((a) => { if (alive) setActivity(a.items ?? []); })
        .catch(() => { /* the rail just stays as-is on a transient error */ });
    void pull();
    const t = window.setInterval(pull, 60_000);
    return () => { alive = false; window.clearInterval(t); };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setRot((i) => (i + 1) % ROT_WORDS.length), 2200);
    return () => window.clearInterval(t);
  }, []);

  const proPlan = useMemo(
    () => data?.plans?.find((p) => /pro/i.test(p.planId)) ?? data?.plans?.[1] ?? null,
    [data],
  );
  const featuredVendors = data?.featuredVendors?.length ? data.featuredVendors : (data?.vendors ?? []);

  return (
    <div className="sfApp">
      <div className="sfWrap">
        <TopNav onSignIn={onSignIn} />

        <header className="sfHero">
          <div className="sfHeroText">
            <span className="sfHeroGlow" aria-hidden="true" />
            <span className="sfTag">◆ One hub for the neighborhood</span>
            <h1 className="sfH1">
              Your block.<br />
              Every <span className="sfRot">{ROT_WORDS[rot]}</span>.<br />
              One hub.
            </h1>
            <p className="sfSub">
              Play the scorecard, split the bill, shop the local marketplace, and find what's open
              nearby. MetroHub brings the whole neighborhood into one place.
            </p>
            <div className="sfCta">
              <a className="sfBtn sfBtnFill" href="/marketplace">Explore the marketplace</a>
              <button className="sfBtn" type="button" onClick={onSignIn}>Sign in to your hub</button>
            </div>
            {data && (
              <div className="sfTrust">
                <span><b>{data.stats.neighbors.toLocaleString()}</b> neighbors</span>
                <span><b>{data.stats.gamesLiveTonight}</b> games live</span>
                <span><b>{data.stats.vendors}</b> local vendors</span>
              </div>
            )}
          </div>

          <LiveFeed items={activity} />
        </header>

        <div className="sfCats">
          <div className="sfCat sfCatPlay">
            <span className="sfKk">Play</span>
            <h3>Game nights</h3>
            <p>Live scorecards for the whole table, synced and shareable.</p>
            <div className="sfApps">
              <a href="/apps/poker-scorecard">♠️ Poker</a>
              <a href="/apps/rummy-scorecard">🃏 Rummy</a>
              <a href="/apps/tambola">🎱 Tambola</a>
              <a href="/apps/bingo">🎯 Bingo</a>
            </div>
          </div>
          <a className="sfCat sfCatManage" href="/apps/my-accounts">
            <span className="sfKk">Manage</span>
            <h3>Money</h3>
            <p>Balances, splits and plans — clear, shared, settled.</p>
            <div className="sfApps"><span>🏦 Accounts</span><span>⚖️ Splits</span><span>💳 Plans</span></div>
          </a>
          <a className="sfCat sfCatShop" href="/marketplace">
            <span className="sfKk">Shop</span>
            <h3>Marketplace</h3>
            <p>Local vendors, deals and what's open around you.</p>
            <div className="sfApps"><span>🏪 Vendors</span><span>🏷️ Deals</span><span>📍 Near By</span></div>
          </a>
        </div>

        <div className="sfSec"><h2>Featured this week</h2><a href="/marketplace">All vendors →</a></div>
        <div className="sfWeek">
          {featuredVendors.slice(0, 4).map((v) => <VendorTile key={v.id} v={v} />)}
          {!data && !error && <div className="sfMuted">Loading vendors…</div>}
          {error && <div className="sfMuted">Couldn't load vendors right now.</div>}
        </div>

        {proPlan && (
          <div className="sfPro">
            <div className="sfProTxt">
              <span className="sfKk sfKkCoral">MetroHub {proPlan.name}</span>
              <h3>Unlock the whole hub.</h3>
              <p>
                Historical game stats, unlimited splits, priority marketplace placement and the AI
                business assistant — one membership for players and local vendors alike.
              </p>
              <a className="sfBtn sfBtnFill" href="/plans">
                Compare plans · from {money(proPlan.prices.USD)}/mo
              </a>
            </div>
            <div className="sfProCmp">
              {proPlan.features.slice(0, 5).map((f, i) => (
                <div className="sfLn" key={`${i}-${f}`}><span className="sfCk">✓</span> {f} <b>{proPlan.name}</b></div>
              ))}
            </div>
          </div>
        )}

        <footer className="sfFoot">
          <div className="sfWord"><span className="sfMark sfMarkSm">M</span> MetroHub</div>
          <span>© {new Date().getFullYear()} · Play · Manage · Shop — all in one hub</span>
        </footer>
      </div>
    </div>
  );
}
