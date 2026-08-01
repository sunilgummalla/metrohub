import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Vendor } from "./types";

interface VendorDetailProps {
  vendor: Vendor;
  onBack: () => void;
}

/**
 * Normalise a vendor-supplied website URL so it is safe to use as an `href`.
 *
 * Rules applied:
 *  1. Trim whitespace.
 *  2. Reject scheme-relative URLs (`//example.com`) — prepending `https:` would
 *     produce `https:////example.com` (invalid). These are rare in user input and
 *     safer to reject than to silently mangle.
 *  3. Reject leading-slash paths (`/path`) — prepending `https://` would produce
 *     `https:///path` which is also invalid.
 *  4. Only allow `http:` and `https:` schemes — any other scheme (e.g.
 *     `javascript:`, `data:`, `vbscript:`) is rejected and `null` is returned.
 *  5. If the value has no scheme at all (plain domain like "example.com"),
 *     prepend `https://` so the browser treats it as an absolute URL rather
 *     than a relative path.
 *
 * Returns `null` when the value is falsy, carries a dangerous scheme, or looks
 * like a relative path rather than an absolute domain.
 */
function sanitiseWebsiteUrl(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Reject scheme-relative URLs (//example.com) and leading-slash paths (/path).
  // Prepending https:// to these produces malformed URLs.
  if (trimmed.startsWith("/")) return null;

  // If the value already contains a scheme, validate it.
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(trimmed)) {
    const lower = trimmed.toLowerCase();
    if (!lower.startsWith("https://") && !lower.startsWith("http://")) {
      // Dangerous or unsupported scheme — reject entirely.
      return null;
    }
    return trimmed;
  }

  // No scheme — treat as a plain domain and prepend https://.
  return `https://${trimmed}`;
}

export function VendorDetail({ vendor, onBack }: VendorDetailProps) {
  const safeWebsite = sanitiseWebsiteUrl(vendor.contact.website);

  return (
    <div className="vm-detail">
      <button className="vm-detail__back" onClick={onBack} aria-label="Back to listings">
        ← Back
      </button>

      {/* Hero image strip */}
      {vendor.images.length > 0 && (
        <div className="vm-detail__images">
          {vendor.images.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${vendor.businessName} image ${i + 1}`}
              className="vm-detail__image"
              loading="lazy"
            />
          ))}
        </div>
      )}

      <div className="vm-detail__content">
        <header className="vm-detail__header">
          <h1 className="vm-detail__name">{vendor.businessName}</h1>
          <span className="vm-detail__category">{vendor.category}</span>
        </header>

        {/* Contact info */}
        <section className="vm-detail__contact" aria-label="Contact information">
          {vendor.address && (
            <p className="vm-detail__address">
              <span aria-hidden="true">📍</span> {vendor.address}
            </p>
          )}
          {vendor.contact.phone && (
            <p>
              <a href={`tel:${vendor.contact.phone}`} className="vm-detail__link">
                <span aria-hidden="true">📞</span> {vendor.contact.phone}
              </a>
            </p>
          )}
          {vendor.contact.email && (
            <p>
              <a href={`mailto:${vendor.contact.email}`} className="vm-detail__link">
                <span aria-hidden="true">✉️</span> {vendor.contact.email}
              </a>
            </p>
          )}
          {safeWebsite && (
            <p>
              <a
                href={safeWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="vm-detail__link"
              >
                <span aria-hidden="true">🌐</span> {vendor.contact.website}
              </a>
            </p>
          )}
        </section>

        {/* Markdown description */}
        {vendor.descriptionMarkdown && (
          <section className="vm-detail__description" aria-label="About">
            <h2>About</h2>
            <div className="vm-detail__markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {vendor.descriptionMarkdown}
              </ReactMarkdown>
            </div>
          </section>
        )}

        {/* Category-specific data */}
        {Object.keys(vendor.categoryData).length > 0 && (
          <section className="vm-detail__category-data" aria-label="Details">
            <h2>Details</h2>
            <dl className="vm-detail__dl">
              {Object.entries(vendor.categoryData).map(([key, val]) => (
                <React.Fragment key={key}>
                  <dt className="vm-detail__dt">{key}</dt>
                  <dd className="vm-detail__dd">{String(val)}</dd>
                </React.Fragment>
              ))}
            </dl>
          </section>
        )}

        {/* Search tags */}
        {vendor.searchTags.length > 0 && (
          <section className="vm-detail__tags-section" aria-label="Tags">
            <h2>Tags</h2>
            <ul className="vm-card__tags">
              {vendor.searchTags.map((tag) => (
                <li key={tag} className="vm-card__tag">
                  {tag}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
