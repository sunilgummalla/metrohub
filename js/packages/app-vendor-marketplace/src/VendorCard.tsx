import React from "react";
import type { Vendor } from "./types";

interface VendorCardProps {
  vendor: Vendor;
  onClick: (vendor: Vendor) => void;
}

/** Returns true if this vendor has an active "featured" booster */
function isFeatured(vendor: Vendor): boolean {
  const now = Date.now();
  return vendor.activeBoosters.some(
    (b) => b.type === "featured_category" && new Date(b.expiresAt).getTime() > now,
  );
}

export function VendorCard({ vendor, onClick }: VendorCardProps) {
  const featured = isFeatured(vendor);
  const thumb = vendor.images[0];

  return (
    <article
      className={`vm-card${featured ? " vm-card--featured" : ""}`}
      onClick={() => onClick(vendor)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick(vendor)}
      aria-label={`View ${vendor.businessName}`}
    >
      {featured && <span className="vm-card__badge">⭐ Featured</span>}

      <div className="vm-card__thumb">
        {thumb ? (
          <img src={thumb} alt={vendor.businessName} loading="lazy" />
        ) : (
          <div className="vm-card__thumb-placeholder">
            <span>{vendor.businessName.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>

      <div className="vm-card__body">
        <h3 className="vm-card__name">{vendor.businessName}</h3>
        <p className="vm-card__category">{vendor.category}</p>
        {vendor.address && <p className="vm-card__address">{vendor.address}</p>}
        {vendor.searchTags.length > 0 && (
          <ul className="vm-card__tags" aria-label="Tags">
            {vendor.searchTags.slice(0, 4).map((tag) => (
              <li key={tag} className="vm-card__tag">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
