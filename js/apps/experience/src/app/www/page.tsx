import type { Metadata } from "next";

export const metadata: Metadata = { title: "MetroHub" };

/**
 * Placeholder surface. The consumer www experience is currently served by the
 * shell app; this surface is where it will move as the experience layer takes
 * over www.
 */
export default function WwwPage() {
  return (
    <main className="surfacePlaceholder">
      <h1>MetroHub</h1>
      <p>The consumer experience is served by the shell for now.</p>
      <p><a href="/member">Are you a business? List with MetroHub →</a></p>
    </main>
  );
}
