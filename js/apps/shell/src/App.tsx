import { Home } from "./home/Home";
import { PokerScorecard } from "@metrohub/poker-scorecard";
import { RummyScorecard } from "@metrohub/rummy-scorecard";
import { TambolaApp } from "@metrohub/tambola";
import { BingoApp } from "@metrohub/bingo";
import { PlansApp } from "@metrohub/plans";
import { MarketplaceApp } from "@metrohub/marketplace";
import { HousingLoanApp } from "@metrohub/housing-loan";
import { useRegistry } from "./home/useRegistry";
import { TopNav } from "./home/TopNav";
import type { AppInfo } from "./home/types";
// Boot splash reuses the homeSplash/homeSpin styles — import them here so the
// loading UI is styled even before <Home> mounts (e.g. deep-linking an app route).
import "./home/home.css";

// ─── Gradient map per category (visual theming, not catalog data) ─────────────
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
// The catalog is Mongo-backed (GET /api/home/apps); routes come from there.
function matchRoute(apps: AppInfo[]): AppInfo | undefined {
  const route = window.location.pathname.replace(/\/+$/, "");
  const routed = apps.filter((app) => app.route); // ignore malformed empty routes
  // Prefer an exact route match; fall back to a nested path (e.g. /apps/x/123),
  // longest route first so a more specific app wins over a prefix.
  return (
    routed.find((app) => route === app.route) ??
    routed
      .slice()
      .sort((a, b) => b.route.length - a.route.length)
      .find((app) => route.startsWith(`${app.route}/`))
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function ShellFooter({ appCount }: { appCount: number }) {
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
        {new Date().getFullYear()} · {appCount} apps · Personal finance &amp; game nights portal
      </span>
    </footer>
  );
}

// ─── App Card ─────────────────────────────────────────────────────────────────
function AppCard({ app }: { app: AppInfo }) {
  const grad = categoryGradient(app.category);

  return (
    <a className="appCard" href={app.route}>
      <div className="appCardIcon" style={{ background: grad }}>
        <span>{app.icon || app.tile.title[0]}</span>
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
function AppWorkspace({ app, apps }: { app: AppInfo; apps: AppInfo[] }) {
  const relatedApps = apps
    .filter((c) => c.category === app.category && c.id !== app.id)
    .slice(0, 3);

  return (
    <main className="workspaceMain">
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
        ) : app.id === "housing-loan" ? (
          <HousingLoanApp />
        ) : (
          <div className="viewportBody">
            <span
              className="viewportMark"
              aria-hidden="true"
              style={{ background: categoryGradient(app.category) }}
            >
              {app.icon || app.tile.title[0]}
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
  // The app catalog is loaded from Mongo at boot; routing waits on it.
  const { status, apps } = useRegistry();

  if (status === "loading") {
    return (
      <div className="homeSplash">
        <span className="homeSpin" aria-hidden="true" />
        <span>Loading your hub…</span>
      </div>
    );
  }

  // On "ready" apps is the live catalog; on "error" it's empty, so any deep
  // link falls back to the Home experience rather than a blank shell.
  const selectedApp = matchRoute(apps);

  // Home route ("/") is the Storefront (signed-out) / Console (signed-in)
  // experience, which brings its own header & footer. App routes keep the
  // shell frame.
  if (!selectedApp) {
    return <Home apps={apps} />;
  }

  // App routes reuse the storefront shell (same background, container, and
  // shared TopNav) so the header is identical across the whole app. The column
  // layout lets the content grow and keeps the footer pinned to the bottom on
  // short pages.
  return (
    <div className="sfApp appShell">
      <div className="sfWrap">
        <TopNav />
        <AppWorkspace app={selectedApp} apps={apps} />
      </div>
      <ShellFooter appCount={apps.length} />
    </div>
  );
}
