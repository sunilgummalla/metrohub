/**
 * Parse an `Authorization: Bearer stub-token-<24hex>` header and return the
 * 24-hex user id, or null when the header is missing, doesn't use the Bearer
 * scheme, or isn't a well-formed stub token.
 *
 * The Bearer scheme is REQUIRED — a bare token (without the scheme) is rejected
 * — so every stub-auth route enforces the same Authorization contract. This is
 * a stub pending a real JWT guard; callers keep their own env gating
 * (ALLOW_STUB_AUTH / SEED_SAMPLE_DATA) and error messages.
 */
export function parseStubBearerToken(
  header: string | string[] | undefined,
): string | null {
  const h = Array.isArray(header) ? header[0] : header;
  if (!h) return null;
  const bearer = /^Bearer\s+(\S.*)$/i.exec(h.trim());
  if (!bearer) return null;
  const match = /^stub-token-([a-f0-9]{24})$/i.exec(bearer[1].trim());
  // Normalize to lowercase — the regex is case-insensitive, so return a
  // canonical id regardless of the case the client sent.
  return match ? match[1].toLowerCase() : null;
}
