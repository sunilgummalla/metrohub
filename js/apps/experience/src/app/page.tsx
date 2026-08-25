/**
 * Root fallback. In practice middleware rewrites every request to a host-based
 * surface (/member, /admin, /www), so this renders only if that didn't run.
 */
export default function Home() {
  return (
    <main className="surfacePlaceholder">
      <h1>MetroHub</h1>
      <p><a href="/member">Business portal</a> · <a href="/www">Home</a></p>
    </main>
  );
}
