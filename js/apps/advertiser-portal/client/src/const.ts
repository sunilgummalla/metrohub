import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Start the Manus OAuth login. Call this from an event handler or effect at the
// moment you want to navigate, e.g. `onClick={() => startLogin()}`.
//
// It has SIDE EFFECTS — it mints a one-time nonce, writes the __Host- state
// cookie, and navigates immediately — so the cookie nonce always matches the
// `state` it sends. Do NOT call it during render (no `href={startLogin()}` /
// `loginUrl={...}`): each call overwrites the cookie, so a stray render-phase
// call would desync it from an in-flight login and the callback would reject it
// with "invalid oauth state". It returns void by design, so there is no URL to
// stash across renders.
export const startLogin = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // Fail fast on misconfiguration instead of building an `undefined/app-auth`
  // URL that only surfaces as an opaque error after the redirect.
  if (!oauthPortalUrl || !appId) {
    throw new Error(
      "OAuth login is misconfigured: VITE_OAUTH_PORTAL_URL and VITE_APP_ID must both be set.",
    );
  }

  // The `__Host-` state cookie requires a secure context; over plain HTTP the
  // browser silently drops it, which later surfaces as "invalid oauth state" at
  // the callback. Fail fast with a clear message (http://localhost counts as
  // secure, so normal local dev still works).
  if (!window.isSecureContext) {
    throw new Error(
      "OAuth login requires a secure (HTTPS) context so the __Host- state cookie can be set. " +
        "Use HTTPS or http://localhost for local development.",
    );
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  const nonce = crypto.randomUUID();
  document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
  const state = encodeOAuthState({ redirectUri, nonce });

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  window.location.href = url.toString();
};
