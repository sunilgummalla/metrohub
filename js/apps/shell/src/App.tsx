import { useMemo, useState } from "react";
import { PokerScorecard } from "@metrohub/poker-scorecard";
import { RummyScorecard } from "@metrohub/rummy-scorecard";
import { TambolaApp } from "@metrohub/tambola";
import { BingoApp } from "@metrohub/bingo";
import { PlansApp } from "@metrohub/plans";
import { MarketplaceApp } from "@metrohub/marketplace";
import registry from "../../api/app-registry.json";

type PortalApp = (typeof registry.apps)[number];

const allCategories = "All";

// ─── Icon map per app id ──────────────────────────────────────────────────────
const APP_ICONS: Record<string, string> = {
  "poker-scorecard": "♠",
  "rummy-scorecard": "🃏",
  "tambola":         "🎱",
  "bingo":           "🔢",
  "splits":          "⚖",
  "my-accounts":     "🏦",
  "deals":           "🏷",
  "near-by":         "📍",
  "plans":           "💳",
  "marketplace":     "🏪",
};

// ─── Gradient map per category ────────────────────────────────────────────────
const CATEGORY_GRADIENTS: Record<string, string> = {
  Scoreboards:   "linear-gradient(135deg,#7c3aed,#a855f7)",
  Accounting:    "linear-gradient(135deg,#0f766e,#14b8a6)",
  Shopping:      "linear-gradient(135deg,#b45309,#f59e0b)",
  "Site Seeing": "linear-gradient(135deg,#2563eb,#60a5fa)",
  Marketplace:   "linear-gradient(135deg,#4338ca,#7c3aed)",
};

function categoryGradient(cat: string) {
  return CATEGORY_GRADIENTS[cat] ?? "linear-gradient(135deg,#475569,#94a3b8)";
}

// ─── Route helpers ────────────────────────────────────────────────────────────
function getInitialApp() {
  const route = window.location.pathname.replace(/\/+$/, "");
  return registry.apps.find(
    (app) => route === app.route || route.startsWith(`${app.route}/`)
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function ShellHeader({ onHome }: { onHome?: () => void }) {
  return (
    <header className="shellHeader">
      <a
        className="brand"
        href="/"
        aria-label="Metro Hub home"
        onClick={onHome ? (e) => { e.preventDefault(); onHome(); } : undefined}
      >
        <img
          src="/brand/logo-horizontal-light-800x267.png"
          alt="Metro Hub"
          className="brandLogo"
          width={168}
          height={56}
        />
      </a>
      <nav className="topNav" aria-label="Shell navigation">
        <a href="/">Apps</a>
        <a href="/marketplace" className="topNavHighlight">Marketplace</a>
        <a href="/apps/my-accounts">Accounts</a>
        <a href="/apps/splits">Splits</a>
      </nav>
    </header>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function ShellFooter() {
  return (
    <footer className="shellFooter">
      <div className="footerLeft">
        <img
          src="/brand/icon-72x72.png"
          alt="Metro Hub"
          className="footerIcon"
          width={24}
          height={24}
        />
        <span className="footerBrand">Metro Hub</span>
      </div>
      <span className="footerMeta">
        {new Date().getFullYear()} · {registry.apps.length} apps · Personal finance &amp; game nights portal
      </span>
    </footer>
  );
}

// ─── App Card ─────────────────────────────────────────────────────────────────
function AppCard({ app }: { app: PortalApp }) {
  const icon = APP_ICONS[app.id] ?? app.tile.title[0];
  const grad = categoryGradient(app.category);

  return (
    <a className="appCard" href={app.route}>
      <div className="appCardIcon" style={{ background: grad }}>
        <span>{icon}</span>
      </div>
      <div className="appCardBody">
        <span className="appCardCategory">{app.category}</span>
        <strong className="appCardTitle">{app.tile.title}</strong>
        <p className="appCardDesc">{app.tile.description}</p>
      </div>
      <span className="appCardArrow">→</span>
    </a>
  );
}

// ─── Category pill ────────────────────────────────────────────────────────────
function CategoryPill({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      className={`categoryPill ${active ? "categoryPillActive" : ""}`}
      type="button"
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
      <span className="categoryPillCount">{count}</span>
    </button>
  );
}

// ─── Stats strip ─────────────────────────────────────────────────────────────
function StatsStrip() {
  const cats = Array.from(new Set(registry.apps.map((a) => a.category)));
  return (
    <div className="statsStrip">
      <div className="statItem">
        <span className="statValue">{registry.apps.length}</span>
        <span className="statLabel">Apps</span>
      </div>
      <div className="statDivider" />
      <div className="statItem">
        <span className="statValue">{cats.length}</span>
        <span className="statLabel">Categories</span>
      </div>
      <div className="statDivider" />
      <div className="statItem">
        <span className="statValue">1</span>
        <span className="statLabel">Hub</span>
      </div>
    </div>
  );
}

// ─── Feature pills ────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: "📊", label: "Finance tracking" },
  { icon: "🃏", label: "Game scorecards" },
  { icon: "⚖",  label: "Bill splitting" },
  { icon: "📍", label: "Nearby discovery" },
];

// ─── Portal Home ──────────────────────────────────────────────────────────────
function PortalHome() {
  const categories = useMemo(
    () => [allCategories, ...Array.from(new Set(registry.apps.map((a) => a.category)))],
    []
  );
  const [activeCategory, setActiveCategory] = useState(allCategories);

  const visibleApps = useMemo(
    () =>
      activeCategory === allCategories
        ? registry.apps
        : registry.apps.filter((a) => a.category === activeCategory),
    [activeCategory]
  );

  const countFor = (cat: string) =>
    cat === allCategories
      ? registry.apps.length
      : registry.apps.filter((a) => a.category === cat).length;

  return (
    <main className="portalMain">

      {/* ── Hero ── */}
      <section className="portalHero">
        {/* Decorative background blobs */}
        <div className="heroBlobGold" aria-hidden="true" />
        <div className="heroBlobTeal" aria-hidden="true" />

        <div className="heroInner">
          {/* Logo mark */}
          <div className="heroLogoWrap">
            <img
              src="/brand/icon-192x192.png"
              alt="Metro Hub"
              className="heroLogoMark"
              width={72}
              height={72}
            />
          </div>

          <div className="heroBadge">⬡ MetroHub · Everything in one place</div>

          <h1 className="heroTitle">
            Your hub for<br />
            <span className="heroAccentGold">finance</span>
            <span className="heroAccentSep"> &amp; </span>
            <span className="heroAccentTeal">game nights.</span>
          </h1>

          <p className="heroSubtitle">
            Track accounts, split costs, score game nights, and discover nearby
            places — all in one consistent hub.
          </p>

          {/* Feature pills */}
          <div className="heroFeatures">
            {FEATURES.map((f) => (
              <span key={f.label} className="heroFeaturePill">
                <span>{f.icon}</span> {f.label}
              </span>
            ))}
          </div>

          <div className="heroButtons">
            <a className="heroBtnPrimary" href="/apps/rummy-scorecard">Open Rummy Scorecard</a>
            <a className="heroBtnSecondary" href="#apps">Browse all apps</a>
          </div>
        </div>

        <div className="heroVisual">
          <StatsStrip />
          <div className="heroAppPreview">
            {registry.apps.slice(0, 4).map((app) => (
              <a key={app.id} className="heroPreviewChip" href={app.route}>
                <span style={{ background: categoryGradient(app.category) }} className="heroPreviewIcon">
                  {APP_ICONS[app.id] ?? app.tile.title[0]}
                </span>
                <div className="heroPreviewChipBody">
                  <span className="heroPreviewChipTitle">{app.tile.title}</span>
                  <span className="heroPreviewChipCat">{app.category}</span>
                </div>
                <span className="heroPreviewChipArrow">→</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── App launcher ── */}
      <section className="appsSection" id="apps">
        <div className="appsSectionHeader">
          <div>
            <h2 className="appsSectionTitle">Your apps</h2>
            <p className="appsSectionSub">{visibleApps.length} app{visibleApps.length !== 1 ? "s" : ""} available</p>
          </div>
        </div>

        {/* Category pills */}
        <div className="categoryPills">
          {categories.map((cat) => (
            <CategoryPill
              key={cat}
              label={cat}
              active={cat === activeCategory}
              count={countFor(cat)}
              onClick={() => setActiveCategory(cat)}
            />
          ))}
        </div>

        {/* App grid */}
        <div className="appsGrid">
          {visibleApps.map((app) => (
            <AppCard app={app} key={app.id} />
          ))}
        </div>
      </section>
    </main>
  );
}

// ─── App Workspace ────────────────────────────────────────────────────────────
function AppWorkspace({ app }: { app: PortalApp }) {
  const relatedApps = registry.apps
    .filter((c) => c.category === app.category && c.id !== app.id)
    .slice(0, 3);

  return (
    <main className="shellMain workspaceMain">
      <section className="workspaceHeader">
        <div>
          <p className="eyebrow">{app.category}</p>
          <h1>{app.displayName}</h1>
          <p>{app.tile.description}</p>
        </div>
        <a className="secondaryAction" href="/">← All apps</a>
      </section>

      <section className="appViewport" aria-label={`${app.displayName} app area`}>
        <div className="viewportToolbar">
          <span>{app.route}</span>
          <span>{app.packageName}</span>
        </div>
        {app.id === "poker-scorecard" ? (
          <div style={{ padding: "0 22px" }}>
            <PokerScorecard />
          </div>
        ) : app.id === "rummy-scorecard" ? (
          <div style={{ padding: "0 22px" }}>
            <RummyScorecard />
          </div>
        ) : app.id === "tambola" ? (
          <TambolaApp />
        ) : app.id === "bingo" ? (
          <BingoApp />
        ) : app.id === "plans" ? (
          <PlansApp />
        ) : app.id === "marketplace" ? (
          <MarketplaceApp citySlug="seattle" />
        ) : (
          <div className="viewportBody">
            <span
              className="viewportMark"
              aria-hidden="true"
              style={{ background: categoryGradient(app.category) }}
            >
              {APP_ICONS[app.id] ?? app.tile.title[0]}
            </span>
            <h2>{app.tile.title}</h2>
            <p>{app.folder}</p>
          </div>
        )}
      </section>

      {relatedApps.length > 0 && (
        <section className="contentBand compactBand" aria-labelledby="related-title">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">{app.category}</p>
              <h2 id="related-title">Related apps</h2>
            </div>
          </div>
          <div className="appGrid compactGrid">
            {relatedApps.map((ra) => (
              <AppCard app={ra} key={ra.id} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function App() {
  const [selectedApp] = useState(() => getInitialApp());

  return (
    <div className="shellFrame">
      <ShellHeader />
      {selectedApp ? <AppWorkspace app={selectedApp} /> : <PortalHome />}
      <ShellFooter />
    </div>
  );
}
