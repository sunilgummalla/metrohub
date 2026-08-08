import { Console } from "./Console";
import { Storefront } from "./Storefront";
import { useSession } from "./useSession";
import "./home.css";

/**
 * The shell home route. Signed-out visitors get the Storefront landing;
 * signed-in members get their personalized Console dashboard.
 */
export function Home() {
  const { status, dashboard, signIn, signOut } = useSession();

  if (status === "loading") {
    return (
      <div className="homeSplash">
        <span className="homeSpin" aria-hidden="true" />
        <span>Loading your hub…</span>
      </div>
    );
  }
  if (status === "in" && dashboard) {
    return <Console data={dashboard} onSignOut={signOut} />;
  }
  return <Storefront onSignIn={signIn} />;
}
