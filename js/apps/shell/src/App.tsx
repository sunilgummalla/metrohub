import { useMemo, useState } from "react";
import { RummyScorecard } from "@money/rummy-scorecard";
import { TambolaApp } from "@money/tambola";
import { BingoApp } from "@money/bingo";
import { PlansApp } from "@money/plans";
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
};

// ─── Gradient map per category ────────────────────────────────────────────────
const CATEGORY_GRADIENTS: Record<string, string> = {
  Scoreboards: "linear-gradient(135deg,#7c3aed,#a855f7)",
  Accounting:  "linear-gradient(135deg,#0f766e,#14b8a6)",
  Shopping:    "linear-gradient(135deg,#b45309,#f59e0b)",
  "Site Seeing": "linear-gradient(135deg,#2563eb,#60a5fa)",
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
      <a className="brand" href="/" aria-label="Money Money home" onClick={onHome ? (e) => { e.preventDefault(); onHome(); } : undefined}>
        <span className="brandMark" aria-hidden="true">MM</span>
        <span className="brandText">
          <strong>Money Money</strong>
          <small>Personal portal</small>
        </span>
      </a>
      <nav className="topNav" aria-label="Shell navigation">
        <a href="/">Apps</a>
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
      <span className="footerBrand">Money Money</span>
      <span className="footerMeta">
        {new Date().getFullYear()} · {registry.apps.length} apps · Personal portal
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
  const categories = Array.from(new Set(registry.apps.map((a) => a.category)));
  return (
    <div className="statsStrip">
      <div className="statItem">
        <span className="statValue">{registry.apps.length}</span>
        <span className="statLabel">Apps</span>
      </div>
      <div className="statDivider" />
      <div className="statItem">
        <span className="statValue">{categories.length}</span>
        <span className="statLabel">Categories</span>
      </div>
      <div className="statDivider" />
      <div className="statItem">
        <span className="statValue">1</span>
        <span className="statLabel">Shell</span>
      </div>
    </div>
  );
}

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
        <div className="heroInner">
          <div className="heroBadge">Personal finance portal</div>
          <h1 className="heroTitle">
            One shell for<br />
            <span className="heroAccent">every money app.</span>
          </h1>
          <p className="heroSubtitle">
            Track accounts, split costs, score game nights, and discover nearby
            places — all in one consistent shell.
          </p>
          <div className="heroButtons">
            <a className="heroBtnPrimary" href="/apps/rummy-scorecard">Open Rummy Scorecard</a>
            <a className="heroBtnSecondary" href="#apps">Browse all apps</a>
          </div>
        </div>
        <div className="heroVisual">
          <StatsStrip />
          <div className="heroAppPreview">
            {registry.apps.slice(0, 3).map((app) => (
              <div key={app.id} className="heroPreviewChip">
                <span style={{ background: categoryGradient(app.category) }} className="heroPreviewIcon">
                  {APP_ICONS[app.id] ?? app.tile.title[0]}
                </span>
                <span>{app.tile.title}</span>
              </div>
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
        {app.id === "rummy-scorecard" ? (
          <div style={{ padding: "0 22px" }}>
            <RummyScorecard />
          </div>
        ) : app.id === "tambola" ? (
          <TambolaApp />
        ) : app.id === "bingo" ? (
          <BingoApp />
        ) : app.id === "plans" ? (
          <PlansApp />
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
