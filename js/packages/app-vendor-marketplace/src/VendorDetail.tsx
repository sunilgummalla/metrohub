import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Vendor } from "./types";

interface VendorDetailProps {
  vendor: Vendor;
  onBack: () => void;
}

export function VendorDetail({ vendor, onBack }: VendorDetailProps) {
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
          {vendor.contact.website && (
            <p>
              <a
                href={vendor.contact.website}
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
