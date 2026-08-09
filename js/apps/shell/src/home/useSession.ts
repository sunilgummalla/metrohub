import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPost, ApiError, getToken, setToken } from "./api";
import type { Dashboard } from "./types";

export type SessionStatus = "loading" | "out" | "in";

export interface Session {
  status: SessionStatus;
  dashboard: Dashboard | null;
  signIn: () => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
}

/**
 * Session gate for the shell home. If a token is present, fetch the console
 * dashboard; otherwise the storefront is shown. `signIn` uses the demo-login
 * endpoint for now (real OAuth swaps in later without changing this shape).
 */
export function useSession(): Session {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  // Guards against setState after the component unmounts (e.g. navigating to an
  // app route while a /dashboard or /demo-login request is still in flight).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      if (mounted.current) {
        setDashboard(null);
        setStatus("out");
      }
      return;
    }
    try {
      const d = await apiGet<Dashboard>("/api/home/dashboard", true);
      // Bail if we unmounted or the token changed mid-flight (sign-out or a
      // newer sign-in) — otherwise we'd flip the UI back to a stale auth state.
      if (!mounted.current || getToken() !== token) return;
      setDashboard(d);
      setStatus("in");
    } catch (err) {
      // Only act if this is still the current token — don't clobber a newer one.
      if (getToken() !== token) return;
      // Drop the token only on a 401 (invalid/expired token). Everything else —
      // transient errors (network, 5xx, timeout) and 403s (which the API also
      // uses for non-auth cases: dashboard disabled when SEED_SAMPLE_DATA is
      // off, or a non-demo persona) — keeps the token so a valid user isn't
      // logged out and a reload/retry can recover.
      if (err instanceof ApiError && err.status === 401) {
        setToken(null);
      }
      if (!mounted.current) return;
      setDashboard(null);
      setStatus("out");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const signIn = useCallback(async () => {
    if (mounted.current) setStatus("loading");
    try {
      const res = await apiPost<{ token: string }>("/api/home/demo-login");
      setToken(res.token);
      await load();
    } catch {
      setToken(null);
      if (!mounted.current) return;
      setDashboard(null);
      setStatus("out");
    }
  }, [load]);

  const signOut = useCallback(() => {
    setToken(null);
    setDashboard(null);
    setStatus("out");
  }, []);

  return { status, dashboard, signIn, signOut, refresh: load };
}
