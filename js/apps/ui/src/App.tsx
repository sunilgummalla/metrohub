const features = [
  "Account surfaces",
  "Transaction review",
  "Budget controls",
  "Goal tracking"
];

export function App() {
  return (
    <main className="app">
      <section className="intro">
        <p>React UI package</p>
        <h1>Reusable browser-facing screens start here.</h1>
      </section>
      <section className="featureGrid" aria-label="UI areas">
        {features.map((feature) => (
          <article key={feature}>
            <span>{feature}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
