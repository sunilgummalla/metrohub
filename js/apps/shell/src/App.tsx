import { useMemo, useState } from "react";
import registry from "../../api/app-registry.json";

type PortalApp = (typeof registry.apps)[number];

const allCategories = "All apps";

function getInitialApp() {
  const route = window.location.pathname.replace(/\/+$/, "");
  return registry.apps.find((app) => route === app.route || route.startsWith(`${app.route}/`));
}

function getInitialCategory(app?: PortalApp) {
  return app?.category ?? allCategories;
}

function ShellHeader() {
  return (
    <header className="shellHeader">
      <a className="brand" href="/" aria-label="Money Money home">
        <span className="brandMark" aria-hidden="true">
          MM
        </span>
        <span>
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

function ShellFooter() {
  return (
    <footer className="shellFooter">
      <span>Money Money shell</span>
      <span>Header and footer stay with the portal.</span>
    </footer>
  );
}

function CategoryNav({
  activeCategory,
  categories,
  onSelect
}: {
  activeCategory: string;
  categories: string[];
  onSelect: (category: string) => void;
}) {
  return (
    <nav className="categoryNav" aria-label="App categories">
      {categories.map((category) => (
        <button
          aria-pressed={category === activeCategory}
          className={category === activeCategory ? "active" : undefined}
          key={category}
          onClick={() => onSelect(category)}
          type="button"
        >
          {category}
        </button>
      ))}
    </nav>
  );
}

function AppTile({ app }: { app: PortalApp }) {
  const initials = app.tile.title
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <a className="appTile" href={app.route}>
      <span className="tileIcon" aria-hidden="true">
        {initials}
      </span>
      <span className="tileContent">
        <small>{app.category}</small>
        <strong>{app.tile.title}</strong>
        <span>{app.tile.description}</span>
      </span>
      <span className="tileAction">Open</span>
    </a>
  );
}

function PortalHome({
  activeCategory,
  categories,
  visibleApps,
  onCategorySelect
}: {
  activeCategory: string;
  categories: string[];
  visibleApps: PortalApp[];
  onCategorySelect: (category: string) => void;
}) {
  const featuredApp = registry.apps.find((app) => app.id === "my-accounts") ?? registry.apps[0];

  return (
    <main className="shellMain">
      <section className="hero" aria-labelledby="portal-title">
        <div className="heroCopy">
          <p className="eyebrow">Money Money Portal</p>
          <h1 id="portal-title">One shell for every money app.</h1>
          <p>
            Start with accounts, split shared costs, score game nights, find nearby
            places, and keep the portal frame consistent across every app.
          </p>
          <div className="heroActions">
            <a className="primaryAction" href={featuredApp.route}>
              Open {featuredApp.tile.title}
            </a>
            <a className="secondaryAction" href="#apps">
              Browse apps
            </a>
          </div>
        </div>

        <aside className="heroPanel" aria-label="Portal status">
          <span>Shell frame</span>
          <strong>Header + workspace + footer</strong>
          <p>{registry.apps.length} apps registered</p>
        </aside>
      </section>

      <section className="contentBand" id="apps" aria-labelledby="apps-title">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">App launcher</p>
            <h2 id="apps-title">Choose a workspace</h2>
          </div>
          <span>{visibleApps.length} shown</span>
        </div>

        <CategoryNav
          activeCategory={activeCategory}
          categories={categories}
          onSelect={onCategorySelect}
        />

        <div className="appGrid">
          {visibleApps.map((app) => (
            <AppTile app={app} key={app.id} />
          ))}
        </div>
      </section>
    </main>
  );
}

function AppWorkspace({ app }: { app: PortalApp }) {
  const relatedApps = registry.apps
    .filter((candidate) => candidate.category === app.category && candidate.id !== app.id)
    .slice(0, 3);

  return (
    <main className="shellMain workspaceMain">
      <section className="workspaceHeader">
        <div>
          <p className="eyebrow">{app.category}</p>
          <h1>{app.displayName}</h1>
          <p>{app.tile.description}</p>
        </div>
        <a className="secondaryAction" href="/">
          All apps
        </a>
      </section>

      <section className="appViewport" aria-label={`${app.displayName} app area`}>
        <div className="viewportToolbar">
          <span>{app.route}</span>
          <span>{app.packageName}</span>
        </div>
        <div className="viewportBody">
          <span className="viewportMark" aria-hidden="true">
            {app.tile.title
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </span>
          <h2>{app.tile.title}</h2>
          <p>{app.folder}</p>
        </div>
      </section>

      {relatedApps.length > 0 ? (
        <section className="contentBand compactBand" aria-labelledby="related-title">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">{app.category}</p>
              <h2 id="related-title">Related apps</h2>
            </div>
          </div>
          <div className="appGrid compactGrid">
            {relatedApps.map((relatedApp) => (
              <AppTile app={relatedApp} key={relatedApp.id} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

export function App() {
  const selectedApp = getInitialApp();
  const categories = useMemo(
    () => [allCategories, ...Array.from(new Set(registry.apps.map((app) => app.category)))],
    []
  );
  const [activeCategory, setActiveCategory] = useState(getInitialCategory(selectedApp));

  const visibleApps = useMemo(() => {
    if (activeCategory === allCategories) {
      return registry.apps;
    }

    return registry.apps.filter((app) => app.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="shellFrame">
      <ShellHeader />
      {selectedApp ? (
        <AppWorkspace app={selectedApp} />
      ) : (
        <PortalHome
          activeCategory={activeCategory}
          categories={categories}
          onCategorySelect={setActiveCategory}
          visibleApps={visibleApps}
        />
      )}
      <ShellFooter />
    </div>
  );
}
