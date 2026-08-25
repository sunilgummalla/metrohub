import { NextResponse, type NextRequest } from "next/server";

/**
 * One experience app, three web audiences — routed by host:
 *   member.<env> / dev-member.<env>  → the vendor/member portal
 *   admin.<env>  / dev-admin.<env>   → the admin console
 *   everything else (www.<env>, dev.<env>, localhost) → the www surface
 *
 * The host's first label picks the surface; the request is rewritten under
 * /member, /admin, or /www so each surface owns its own route tree. (During the
 * transition the real consumer www is still served by the shell; the /www
 * surface here is a placeholder.)
 *
 * For local dev, hit /member, /admin, or /www directly — localhost resolves to
 * the www surface otherwise.
 */
export function middleware(req: NextRequest): NextResponse | undefined {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) return undefined;

  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  // Local dev: serve each surface at its own path (/member, /admin, /www)
  // directly, since localhost has no meaningful subdomain to key off.
  if (host === "localhost" || host === "127.0.0.1") return undefined;

  const surface = surfaceForHost(host);
  if (pathname === `/${surface}` || pathname.startsWith(`/${surface}/`)) return undefined;

  const url = req.nextUrl.clone();
  url.pathname = `/${surface}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

function surfaceForHost(host: string): "member" | "admin" | "www" {
  const label = host.split(".")[0];
  if (label === "member" || label === "dev-member") return "member";
  if (label === "admin" || label === "dev-admin") return "admin";
  return "www";
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
