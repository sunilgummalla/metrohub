import { useState } from "react";
import { Home } from "./home/Home";
import { PokerScorecard } from "@metrohub/poker-scorecard";
import { RummyScorecard } from "@metrohub/rummy-scorecard";
import { TambolaApp } from "@metrohub/tambola";
import { BingoApp } from "@metrohub/bingo";
import { PlansApp } from "@metrohub/plans";
import { MarketplaceApp } from "@metrohub/marketplace";
import registry from "../../api/app-registry.json";

type PortalApp = (typeof registry.apps)[number];

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

  // Home route ("/") is the Storefront (signed-out) / Console (signed-in)
  // experience, which brings its own header & footer. App routes keep the
  // shell frame.
  if (!selectedApp) {
    return <Home />;
  }

  return (
    <div className="shellFrame">
      <ShellHeader />
      <AppWorkspace app={selectedApp} />
      <ShellFooter />
    </div>
  );
}
