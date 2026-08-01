import { useState, useCallback } from "react";
import type { MemberSession } from "../api";

const TOKEN_KEY = "mh_member_token";
const SESSION_KEY = "mh_member_session";

function loadSession(): MemberSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as MemberSession) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [session, setSession] = useState<MemberSession | null>(loadSession);

  const saveSession = useCallback((s: MemberSession) => {
    sessionStorage.setItem(TOKEN_KEY, s.token);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  return { session, saveSession, clearSession, isLoggedIn: session !== null };
}
