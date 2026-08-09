// home.css is imported by the entry points that render this (App.tsx and
// Home.tsx), so it isn't re-imported here to avoid a hidden global side effect.

const LINKS: Array<{ label: string; href: string; pro?: boolean }> = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "Games", href: "/apps/rummy-scorecard" },
  { label: "Money", href: "/apps/my-accounts" },
  { label: "Near By", href: "/apps/near-by" },
  { label: "Pro", href: "/plans", pro: true },
];

/**
 * The shared top navigation used by both the storefront (signed-out landing)
 * and the app workspace pages, so the header is identical everywhere. On the
 * storefront `onSignIn` wires the demo sign-in; on app pages it's omitted and
 * the buttons link back to the hub / plans.
 */
export function TopNav({ onSignIn }: { onSignIn?: () => void }) {
  return (
    <nav className="sfNav">
      <a className="sfWord" href="/"><span className="sfMark">M</span> MetroHub</a>
      <div className="sfLinks">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} className={l.pro ? "sfLinkPro" : undefined}>{l.label}</a>
        ))}
      </div>
      <span className="sfSp" />
      {onSignIn ? (
        <>
          <button className="sfBtn" type="button" onClick={onSignIn}>Sign in</button>
          <button className="sfBtn sfBtnFill" type="button" onClick={onSignIn}>Get MetroHub Pro</button>
        </>
      ) : (
        <>
          <a className="sfBtn" href="/">Sign in</a>
          <a className="sfBtn sfBtnFill" href="/plans">Get MetroHub Pro</a>
        </>
      )}
    </nav>
  );
}
