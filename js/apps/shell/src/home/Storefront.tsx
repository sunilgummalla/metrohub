import { useEffect, useMemo, useState } from "react";
import { apiGet, money } from "./api";
import type { Landing, VendorCard } from "./types";

const ROT_WORDS = ["game nights", "shared bills", "local storefronts", "nearby deals"];

function stars(rating: number | null): string {
  if (rating == null) return "";
  const full = Math.round(rating);
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
          {v.rating != null && <span className="sfStars">{stars(v.rating)}</span>}
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
  const [error, setError] = useState(false);
  const [rot, setRot] = useState(0);

  useEffect(() => {
    apiGet<Landing>("/api/home/landing").then(setData).catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setRot((i) => (i + 1) % ROT_WORDS.length), 2200);
    return () => window.clearInterval(t);
  }, []);

  const proPlan = useMemo(
    () => data?.plans.find((p) => /pro/i.test(p.planId)) ?? data?.plans[1] ?? null,
    [data],
  );
  const featuredVendors = data?.featuredVendors.length ? data.featuredVendors : data?.vendors ?? [];

  return (
    <div className="sfApp">
      <div className="sfWrap">
        <nav className="sfNav">
          <a className="sfWord" href="/"><span className="sfMark">M</span> MetroHub</a>
          <div className="sfLinks">
            <a href="/marketplace">Marketplace</a>
            <a href="/">Games</a>
            <a href="/apps/my-accounts">Money</a>
            <a href="/apps/near-by">Near By</a>
            <a href="/plans" className="sfLinkPro">Pro</a>
          </div>
          <span className="sfSp" />
          <button className="sfBtn" type="button" onClick={onSignIn}>Sign in</button>
          <button className="sfBtn sfBtnFill" type="button" onClick={onSignIn}>Get MetroHub Pro</button>
        </nav>

        <header className="sfHero">
          <div>
            <span className="sfTag">◆ One hub for the neighborhood</span>
            <h1 className="sfH1">
              Everything the block does — <span className="sfRot">{ROT_WORDS[rot]}</span>.
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

          {data?.featuredDeal && (
            <aside className="sfFeature">
              <div className="sfAd">
                <span>🏪</span> Featured this week · {data.featuredDeal.vendor?.name ?? "Local vendor"}
                <span className="sfAdTag">AD</span>
              </div>
              <div className="sfFb">
                <h3>{data.featuredDeal.title}</h3>
                <p>{data.featuredDeal.blurb}</p>
                {data.featuredDeal.vendor && (
                  <div className="sfMeta">
                    <span className="sfStars">{stars(data.featuredDeal.vendor.rating)}</span>
                    {data.featuredDeal.vendor.rating?.toFixed(1)} · {data.featuredDeal.vendor.category}
                    {data.featuredDeal.vendor.distanceMi != null && ` · ${data.featuredDeal.vendor.distanceMi} mi`}
                    {data.featuredDeal.vendor.open && <span className="sfOpen">Open now</span>}
                  </div>
                )}
              </div>
            </aside>
          )}
        </header>

        <div className="sfCats">
          <a className="sfCat sfCatPlay" href="/">
            <span className="sfKk">Play</span>
            <h3>Game nights</h3>
            <p>Live scorecards for the whole table, synced and shareable.</p>
            <div className="sfApps"><span>♠️ Poker</span><span>🃏 Rummy</span><span>🎱 Tambola</span><span>🎯 Bingo</span></div>
          </a>
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
              {proPlan.features.slice(0, 5).map((f) => (
                <div className="sfLn" key={f}><span className="sfCk">✓</span> {f} <b>{proPlan.name}</b></div>
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
