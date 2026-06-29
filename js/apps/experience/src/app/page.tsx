const dashboardCards = [
  {
    label: "Net worth",
    value: "$42,180",
    detail: "+4.2% this month"
  },
  {
    label: "Monthly spend",
    value: "$3,280",
    detail: "68% of plan"
  },
  {
    label: "Cash buffer",
    value: "5.4 mo",
    detail: "Healthy"
  }
];

const navItems = ["Overview", "Accounts", "Budgets", "Goals"];

export default function Home() {
  return (
    <main className="shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <span className="brandMark" aria-hidden="true">
            $
          </span>
          <span>Money Money</span>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <a className={item === "Overview" ? "active" : undefined} href="#" key={item}>
              {item}
            </a>
          ))}
        </nav>
      </aside>

      <section className="workspace" aria-label="Dashboard shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Shell app</p>
            <h1>Personal finance workspace</h1>
          </div>
          <button type="button">Connect account</button>
        </header>

        <section className="metrics" aria-label="Financial summary">
          {dashboardCards.map((card) => (
            <article className="metric" key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="panel">
          <div>
            <p className="eyebrow">Next up</p>
            <h2>Build the money flow</h2>
            <p>
              This Next.js shell is ready for account linking, transaction views,
              budgets, goals, and server-rendered experience routes.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
