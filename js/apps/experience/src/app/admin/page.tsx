import type { Metadata } from "next";

export const metadata: Metadata = { title: "MetroHub Admin" };

/** Placeholder surface — the admin console will be built here. */
export default function AdminPage() {
  return (
    <main className="surfacePlaceholder">
      <h1>MetroHub Admin</h1>
      <p>The admin console will live here.</p>
    </main>
  );
}
