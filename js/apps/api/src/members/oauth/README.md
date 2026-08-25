# Member OAuth sign-in

Real authorization-code OAuth for vendor onboarding. **Every provider is
optional** — one is enabled only when both its client id and secret are set, so
the app runs fine with zero, some, or all providers configured. Unconfigured
providers are simply not offered (the sign-in panel shows only what's available;
in local dev with none configured it falls back to a demo stub).

## Environment variables

| Variable | Purpose |
| --- | --- |
| `MH_SESSION_SECRET` | HMAC key that signs OAuth session tokens. Set a stable random value in each deployed env (a per-process fallback is used if unset, so sessions won't survive a restart). |
| `OAUTH_REDIRECT_BASE` | Public origin the provider redirects back to — the **member portal** origin, e.g. `https://dev-member.metrohub.io` (dev) / `https://member.metrohub.io` (prod). Defaults to `https://<MEMBER_DOMAIN>` in the deploy. Falls back to the request origin if unset. |
| `OAUTH_GOOGLE_CLIENT_ID` / `_SECRET` | Google Cloud → APIs & Services → Credentials (OAuth client, Web). |
| `OAUTH_ENTRA_CLIENT_ID` / `_SECRET` | Microsoft Entra app registration (one app serves both Work and Personal). |
| `OAUTH_AMAZON_CLIENT_ID` / `_SECRET` | Login with Amazon security profile. |
| `OAUTH_INSTAGRAM_CLIENT_ID` / `_SECRET` | Meta app (Facebook Login → Instagram). |

## Redirect URI to register with each provider

```
<OAUTH_REDIRECT_BASE>/api/members/auth/<provider>/callback
```

e.g. `https://dev-member.metrohub.io/api/members/auth/google/callback`. The `<provider>`
ids are: `google`, `entra-work`, `entra-personal`, `amazon`, `instagram`
(Entra work and personal share the same app registration, so register both
callback URIs or the shared one per your app config).

## Endpoints

- `GET /api/members/auth/providers` — which providers are available (+ whether the dev stub is on).
- `GET /api/members/auth/:provider/start?redirect=/marketplace` — 302 to the provider consent screen.
- `GET /api/members/auth/:provider/callback` — provider redirect target; mints a signed session and returns to the app with the token in the URL fragment.

Sessions from real OAuth are accepted in every environment; the dev-only
`stub-token-<id>` scheme is accepted only when `ALLOW_STUB_AUTH=true` and
`NODE_ENV !== "production"`.

## Member portal hosting

The vendor onboarding lives on its own subdomain, served by the `experience`
app (host-routed): `dev-member.metrohub.io` (dev) / `member.metrohub.io` (prod).
The deploy sets `MEMBER_DOMAIN` and adds a Traefik router for it; the API keeps
no public hostname (the experience app proxies `/api/*` to it internally).

**Manual step (one-time, per subdomain):** the Cloudflare tunnel is
token-based (remotely managed), so add the public hostname in the Cloudflare
Zero Trust dashboard — a DNS/route for `dev-member.metrohub.io` (and
`member.metrohub.io`) pointing at the tunnel → `http://traefik:80`. This is the
same wiring the app domain uses; it can't be done from the repo.
