import type { Express } from "express";
import { ENV } from "./env";
import { sdk } from "./sdk";

/**
 * Reject keys that could escape the app's storage namespace. The proxy mints a
 * signed URL for whatever `path` it is given, so an attacker must not be able to
 * point it at arbitrary/other-tenant objects via traversal or absolute paths.
 */
function isSafeStorageKey(key: string): boolean {
  if (!key) return false;
  let decoded = key;
  try {
    decoded = decodeURIComponent(key);
  } catch {
    return false; // malformed percent-encoding
  }
  if (decoded.startsWith("/")) return false; // absolute path
  if (decoded.includes("..")) return false; // path traversal
  if (decoded.includes("://") || decoded.includes("\\")) return false; // absolute URL / backslash
  return true;
}

/** Per-user object namespace. User-owned uploads live under this prefix so the
 *  proxy can enforce ownership (see `userStorageKey` in ../storage). */
function userPrefix(userId: number): string {
  return `u/${userId}/`;
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    // Require an authenticated session — this endpoint uses the server's Forge
    // API key to mint signed GET URLs, so it must not be open to the public.
    let user = null;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      user = null;
    }
    if (!user) {
      res.status(401).send("Authentication required");
      return;
    }

    const key = (req.params as Record<string, string>)[0];
    if (!key || !isSafeStorageKey(key)) {
      res.status(400).send("Missing or invalid storage key");
      return;
    }

    // Enforce per-user object ownership: a non-admin may only fetch keys under
    // their own `u/<id>/` namespace, so learning another advertiser's key does
    // not grant access. Admins are exempt (needed for ad-creative moderation).
    const decodedKey = decodeURIComponent(key);
    if (user.role !== "admin" && !decodedKey.startsWith(userPrefix(user.id))) {
      res.status(403).send("Forbidden");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
