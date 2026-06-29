const features = [
  "Sticky header",
  "Category navigation",
  "App tiles",
  "Sticky footer"
];

export function App() {
  return (
    <main className="app">
      <section className="intro">
        <p>Money-Money shell</p>
        <h1>Micro-app entry points start here.</h1>
      </section>
      <section className="featureGrid" aria-label="Shell areas">
        {features.map((feature) => (
          <article key={feature}>
            <span>{feature}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
