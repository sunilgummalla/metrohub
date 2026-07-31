import React, { useCallback, useEffect, useRef, useState } from "react";
import { browseVendors, getCategories, getVendor } from "./api";
import { VendorCard } from "./VendorCard";
import { VendorDetail } from "./VendorDetail";
import type { BrowseFilters, Vendor } from "./types";
import "./vendor-marketplace.css";

interface VendorMarketplaceAppProps {
  /** City slug for this MetroHub instance, e.g. "seattle" */
  citySlug?: string;
}

const PAGE_SIZE = 20;

export function VendorMarketplaceApp({ citySlug = "seattle" }: VendorMarketplaceAppProps) {
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

  // Track the previous citySlug so we can reset filters when it changes.
  // Using a ref avoids adding citySlug as a dependency to the filters effect.
  const prevCitySlugRef = useRef(citySlug);

  useEffect(() => {
    if (prevCitySlugRef.current !== citySlug) {
      prevCitySlugRef.current = citySlug;
      // Reset all filters to the new city — clears category, search query, and
      // resets to page 1 so the new city's results load from the beginning.
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

  const handleCategoryClick = useCallback(
    (cat: string) => {
      setFilters((f) => ({
        ...f,
        category: f.category === cat ? undefined : cat,
        page: 1,
      }));
    },
    [],
  );

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setFilters((f) => ({ ...f, q: searchInput.trim() || undefined, page: 1 }));
    },
    [searchInput],
  );

  const handleVendorClick = useCallback(async (vendor: Vendor) => {
    try {
      const full = await getVendor(vendor._id);
      setSelectedVendor(full);
    } catch {
      setSelectedVendor(vendor);
    }
  }, []);

  const handleBack = useCallback(() => setSelectedVendor(null), []);

  // Use filters.limit (not the constant PAGE_SIZE) so pagination stays correct
  // if the limit is ever changed dynamically.
  const activeLimit = filters.limit ?? PAGE_SIZE;
  const totalPages = Math.ceil(total / activeLimit);

  if (selectedVendor) {
    return <VendorDetail vendor={selectedVendor} onBack={handleBack} />;
  }

  return (
    <div className="vm-app">
      {/* Header */}
      <header className="vm-header">
        <h1 className="vm-header__title">Vendor Marketplace</h1>
        <p className="vm-header__subtitle">
          Discover local businesses, services, and professionals in {citySlug}
        </p>

        {/* Search bar */}
        <form className="vm-search" onSubmit={handleSearch} role="search">
          <input
            className="vm-search__input"
            type="search"
            placeholder="Search vendors, services, tags…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search vendors"
          />
          <button className="vm-search__btn" type="submit">
            Search
          </button>
        </form>
      </header>

      {/* Category pills */}
      {categories.length > 0 && (
        <nav className="vm-categories" aria-label="Filter by category">
          <button
            className={`vm-category-pill${!filters.category ? " vm-category-pill--active" : ""}`}
            onClick={() => setFilters((f) => ({ ...f, category: undefined, page: 1 }))}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`vm-category-pill${filters.category === cat ? " vm-category-pill--active" : ""}`}
              onClick={() => handleCategoryClick(cat)}
            >
              {cat}
            </button>
          ))}
        </nav>
      )}

      {/* Results */}
      <main className="vm-results">
        {loading && (
          <div className="vm-loading" role="status" aria-live="polite">
            Loading vendors…
          </div>
        )}

        {!loading && error && (
          <div className="vm-error" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && vendors.length === 0 && (
          <div className="vm-empty">
            No vendors found.{" "}
            {filters.q || filters.category ? (
              <button
                className="vm-empty__reset"
                onClick={() =>
                  setFilters({ citySlug, page: 1, limit: PAGE_SIZE })
                }
              >
                Clear filters
              </button>
            ) : null}
          </div>
        )}

        <div className="vm-grid">
          {vendors.map((v) => (
            <VendorCard key={v._id} vendor={v} onClick={handleVendorClick} />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="vm-pagination" aria-label="Pagination">
            <button
              className="vm-pagination__btn"
              disabled={(filters.page ?? 1) <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
            >
              ← Prev
            </button>
            <span className="vm-pagination__info">
              Page {filters.page ?? 1} of {totalPages} ({total} vendors)
            </span>
            <button
              className="vm-pagination__btn"
              disabled={(filters.page ?? 1) >= totalPages}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
            >
              Next →
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}
