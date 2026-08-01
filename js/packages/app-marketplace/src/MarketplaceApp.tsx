import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { browseVendors, getCategories, getVendor } from "./api";
import { VendorDetail } from "./VendorDetail";
import type { BrowseFilters, Vendor } from "./types";
import "./marketplace.css";

interface MarketplaceAppProps {
  /** City slug for this MetroHub instance, e.g. "seattle" */
  citySlug?: string;
}

const PAGE_SIZE = 20;

// Category → emoji icon. Real categories come from the API as free-form strings,
// so we match on a normalised (lowercased) key and fall back to a storefront icon.
const CATEGORY_ICONS: Record<string, string> = {
  "food-drink": "🍽",
  "food & drink": "🍽",
  restaurant: "🍽",
  events: "🎟",
  "events & tickets": "🎟",
  services: "🔧",
  "local services": "🔧",
  health: "💆",
  "health & wellness": "💆",
  retail: "🛍",
  "retail & shopping": "🛍",
  shopping: "🛍",
  entertainment: "🎭",
  beauty: "💅",
  "beauty & salon": "💅",
  education: "📚",
  "classes & tuition": "📚",
};

function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category.trim().toLowerCase()] ?? "🏪";
}

/** True when the vendor has an unexpired "featured" booster. */
function isFeatured(vendor: Vendor): boolean {
  const now = Date.now();
  return vendor.activeBoosters.some(
    (b) => b.type === "featured_category" && new Date(b.expiresAt).getTime() > now
  );
}

/** First non-empty line of the markdown description, lightly de-marked for a tagline. */
function tagline(vendor: Vendor): string {
  const firstLine = (vendor.descriptionMarkdown ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!firstLine) return "";
  const plain = firstLine.replace(/^#+\s*/, "").replace(/[*_`>#]/g, "").trim();
  return plain.length > 140 ? `${plain.slice(0, 137)}…` : plain;
}

// ─── Business card (Aurora presentation, real vendor data) ────────────────────
function BusinessCard({
  vendor,
  onClick,
}: {
  vendor: Vendor;
  onClick: (vendor: Vendor) => void;
}) {
  const featured = isFeatured(vendor);
  const line = tagline(vendor);
  return (
    <button type="button" className="mktBizCard" onClick={() => onClick(vendor)} aria-label={`View ${vendor.businessName}`}>
      {featured && <span className="mktBadge mktBadgeFeatured">Featured</span>}
      <div className="mktBizIconWrap">
        {vendor.images[0] ? (
          <img className="mktBizThumb" src={vendor.images[0]} alt={vendor.businessName} loading="lazy" />
        ) : (
          <span className="mktBizIcon">{categoryIcon(vendor.category)}</span>
        )}
      </div>
      <div className="mktBizBody">
        <div className="mktBizTop">
          <h3 className="mktBizName">{vendor.businessName}</h3>
        </div>
        {line && <p className="mktBizTagline">{line}</p>}
        <div className="mktBizMeta">
          <span className="mktBizCategory">{vendor.category}</span>
          {vendor.address && (
            <>
              <span className="mktBizDot">·</span>
              <span className="mktBizDist">{vendor.address}</span>
            </>
          )}
        </div>
        {vendor.searchTags.length > 0 && (
          <div className="mktBizTags">
            {vendor.searchTags.slice(0, 4).map((t) => (
              <span key={t} className="mktBizTag">{t}</span>
            ))}
          </div>
        )}
      </div>
      <span className="mktBizCta" aria-hidden="true">View →</span>
    </button>
  );
}

// ─── Category tile (Aurora presentation, real categories) ─────────────────────
function CategoryTile({
  category,
  active,
  onClick,
}: {
  category: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`mktCatTile ${active ? "mktCatTileActive" : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="mktCatIcon">{categoryIcon(category)}</span>
      <span className="mktCatLabel">{category}</span>
    </button>
  );
}

/**
 * MarketplaceApp — MetroHub's unified marketplace.
 *
 * Combines the Aurora-themed presentation (hero + search, category tiles,
 * business-card grid, "list your business" CTA) with the backend-connected
 * browse experience (real `/api/vendors` data, category filter, server-side
 * search, pagination, and the full vendor detail view).
 */
export function MarketplaceApp({ citySlug = "seattle" }: MarketplaceAppProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<BrowseFilters>({
    citySlug,
    page: 1,
    limit: PAGE_SIZE,
  });
  const [searchInput, setSearchInput] = useState("");

  // Reset all state when the city changes, without adding citySlug to the
  // filters effect's dependencies (a ref avoids a redundant reload).
  const prevCitySlugRef = useRef(citySlug);
  useEffect(() => {
    if (prevCitySlugRef.current !== citySlug) {
      prevCitySlugRef.current = citySlug;
      setFilters({ citySlug, page: 1, limit: PAGE_SIZE });
      setSearchInput("");
      setSelectedVendor(null);
    }
  }, [citySlug]);

  // Load categories whenever the city changes
  useEffect(() => {
    getCategories(citySlug)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [citySlug]);

  // Load vendors whenever filters change
  useEffect(() => {
    setLoading(true);
    setError(null);
    browseVendors(filters)
      .then(({ data, total }) => {
        setVendors(data);
        setTotal(total);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters]);

  const handleCategoryClick = useCallback((cat: string) => {
    setFilters((f) => ({ ...f, category: f.category === cat ? undefined : cat, page: 1 }));
  }, []);

  const handleSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setFilters((f) => ({ ...f, q: searchInput.trim() || undefined, page: 1 }));
    },
    [searchInput]
  );

  const resetFilters = useCallback(() => {
    setFilters({ citySlug, page: 1, limit: PAGE_SIZE });
    setSearchInput("");
  }, [citySlug]);

  const handleVendorClick = useCallback(async (vendor: Vendor) => {
    try {
      const full = await getVendor(vendor._id);
      setSelectedVendor(full);
    } catch {
      setSelectedVendor(vendor);
    }
  }, []);

  const handleBack = useCallback(() => setSelectedVendor(null), []);

  const activeLimit = filters.limit ?? PAGE_SIZE;
  const totalPages = Math.ceil(total / activeLimit);
  const activePage = filters.page ?? 1;

  if (selectedVendor) {
    return (
      <div className="mktApp">
        <VendorDetail vendor={selectedVendor} onBack={handleBack} />
      </div>
    );
  }

  return (
    <div className="mktApp">
      {/* ── Hero strip with search ── */}
      <div className="mktHero">
        <div className="mktHeroInner">
          <h2 className="mktHeroTitle">Local Marketplace</h2>
          <p className="mktHeroSub">
            Discover businesses, book services, grab deals — all in {citySlug}.
          </p>
          <form className="mktSearchWrap" onSubmit={handleSearch} role="search">
            <span className="mktSearchIcon" aria-hidden="true">🔍</span>
            <input
              className="mktSearchInput"
              type="search"
              placeholder="Search businesses, services, cuisines…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search marketplace"
            />
            <button className="mktSearchBtn" type="submit">Search</button>
          </form>
        </div>
      </div>

      {/* ── Category tiles ── */}
      {categories.length > 0 && (
        <section className="mktSection">
          <div className="mktSectionHeader">
            <h3 className="mktSectionTitle">Browse by category</h3>
            {filters.category && (
              <button type="button" className="mktClearFilter" onClick={() => setFilters((f) => ({ ...f, category: undefined, page: 1 }))}>
                Clear filter ×
              </button>
            )}
          </div>
          <div className="mktCatGrid">
            {categories.map((cat) => (
              <CategoryTile
                key={cat}
                category={cat}
                active={filters.category === cat}
                onClick={() => handleCategoryClick(cat)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Business listings ── */}
      <section className="mktSection">
        <div className="mktSectionHeader">
          <h3 className="mktSectionTitle">{filters.category ?? "All businesses"}</h3>
          {!loading && !error && <span className="mktResultCount">{total} results</span>}
        </div>

        {loading && (
          <div className="mktLoading" role="status" aria-live="polite">Loading businesses…</div>
        )}

        {!loading && error && (
          <div className="mktError" role="alert">{error}</div>
        )}

        {!loading && !error && vendors.length === 0 && (
          <div className="mktEmpty">
            <span className="mktEmptyIcon">🔍</span>
            <p>No businesses match your search. Try a different term or category.</p>
            {(filters.q || filters.category) && (
              <button type="button" className="mktClearFilter" onClick={resetFilters}>Clear filters</button>
            )}
          </div>
        )}

        {!loading && !error && vendors.length > 0 && (
          <div className="mktBizGrid">
            {vendors.map((v) => (
              <BusinessCard key={v._id} vendor={v} onClick={handleVendorClick} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="mktPagination" aria-label="Pagination">
            <button
              type="button"
              className="mktPageBtn"
              disabled={activePage <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
            >
              ← Prev
            </button>
            <span className="mktPageInfo">
              Page {activePage} of {totalPages} ({total} businesses)
            </span>
            <button
              type="button"
              className="mktPageBtn"
              disabled={activePage >= totalPages}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
            >
              Next →
            </button>
          </nav>
        )}
      </section>

      {/* ── CTA for businesses ── */}
      <section className="mktJoinBanner">
        <div className="mktJoinInner">
          <div>
            <h3 className="mktJoinTitle">Are you a local business?</h3>
            <p className="mktJoinSub">
              Join the MetroHub Marketplace — reach thousands of active local users.
            </p>
          </div>
          <button type="button" className="mktJoinBtn">List your business →</button>
        </div>
      </section>
    </div>
  );
}
