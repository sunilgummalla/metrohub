import { useState } from "react";
import "./marketplace.css";

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "food-drink",    label: "Food & Drink",      icon: "🍽",  count: 24 },
  { id: "events",        label: "Events & Tickets",  icon: "🎟",  count: 12 },
  { id: "services",      label: "Local Services",    icon: "🔧",  count: 31 },
  { id: "health",        label: "Health & Wellness", icon: "💆",  count: 18 },
  { id: "retail",        label: "Retail & Shopping", icon: "🛍",  count: 27 },
  { id: "entertainment", label: "Entertainment",     icon: "🎭",  count: 9  },
  { id: "beauty",        label: "Beauty & Salon",    icon: "💅",  count: 15 },
  { id: "education",     label: "Classes & Tuition", icon: "📚",  count: 7  },
];

interface Business {
  id: string;
  name: string;
  category: string;
  tagline: string;
  tags: string[];
  rating: number;
  reviews: number;
  distance: string;
  badge?: "Featured" | "New" | "Hot Deal";
  open: boolean;
}

const BUSINESSES: Business[] = [
  {
    id: "b1", name: "Spice Garden", category: "food-drink",
    tagline: "Authentic Indian cuisine — dine-in, takeaway & catering",
    tags: ["Indian", "Vegetarian", "Catering"],
    rating: 4.8, reviews: 312, distance: "0.4 mi",
    badge: "Featured", open: true,
  },
  {
    id: "b2", name: "Metro Brew Co.", category: "food-drink",
    tagline: "Craft coffee & artisan pastries, open from 6 AM",
    tags: ["Coffee", "Pastries", "Breakfast"],
    rating: 4.6, reviews: 189, distance: "0.7 mi",
    badge: "Hot Deal", open: true,
  },
  {
    id: "b3", name: "FitZone Studio", category: "health",
    tagline: "HIIT, yoga & personal training in the heart of the metro",
    tags: ["Fitness", "Yoga", "HIIT"],
    rating: 4.9, reviews: 94, distance: "1.1 mi",
    badge: "New", open: true,
  },
  {
    id: "b4", name: "Glow & Go Salon", category: "beauty",
    tagline: "Hair, nails & skin — walk-ins welcome",
    tags: ["Hair", "Nails", "Skin"],
    rating: 4.5, reviews: 207, distance: "0.9 mi",
    open: true,
  },
  {
    id: "b5", name: "TechFix Hub", category: "services",
    tagline: "Same-day phone & laptop repairs, certified technicians",
    tags: ["Repairs", "Electronics", "Same-day"],
    rating: 4.7, reviews: 145, distance: "1.3 mi",
    open: true,
  },
  {
    id: "b6", name: "Starlight Events", category: "events",
    tagline: "Live music, comedy nights & private event bookings",
    tags: ["Live Music", "Comedy", "Private Events"],
    rating: 4.4, reviews: 78, distance: "2.0 mi",
    badge: "Featured", open: false,
  },
  {
    id: "b7", name: "The Book Nook", category: "retail",
    tagline: "Independent bookstore with rare finds & author events",
    tags: ["Books", "Gifts", "Events"],
    rating: 4.9, reviews: 56, distance: "1.6 mi",
    open: true,
  },
  {
    id: "b8", name: "Mindful Moves", category: "education",
    tagline: "Dance, music & art classes for all ages",
    tags: ["Dance", "Music", "Art"],
    rating: 4.7, reviews: 41, distance: "1.8 mi",
    badge: "New", open: true,
  },
  {
    id: "b9", name: "Tandoor Express", category: "food-drink",
    tagline: "Street-style tandoor wraps & biryani, fast & fresh",
    tags: ["Indian", "Fast Food", "Wraps"],
    rating: 4.3, reviews: 228, distance: "0.5 mi",
    open: true,
  },
  {
    id: "b10", name: "CleanPro Services", category: "services",
    tagline: "Home & office deep cleaning, flexible scheduling",
    tags: ["Cleaning", "Home", "Office"],
    rating: 4.6, reviews: 113, distance: "2.2 mi",
    open: true,
  },
];

const BADGE_STYLES: Record<string, string> = {
  Featured: "mktBadgeFeatured",
  New:       "mktBadgeNew",
  "Hot Deal":"mktBadgeHot",
};

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="mktStars" aria-label={`${rating} out of 5`}>
      {"★".repeat(full)}
      {half ? "½" : ""}
      {"☆".repeat(empty)}
    </span>
  );
}

// ─── Business Card ────────────────────────────────────────────────────────────
function BusinessCard({ biz }: { biz: Business }) {
  return (
    <div className="mktBizCard">
      {biz.badge && (
        <span className={`mktBadge ${BADGE_STYLES[biz.badge]}`}>{biz.badge}</span>
      )}
      <div className="mktBizIconWrap">
        <span className="mktBizIcon">
          {CATEGORIES.find((c) => c.id === biz.category)?.icon ?? "🏪"}
        </span>
      </div>
      <div className="mktBizBody">
        <div className="mktBizTop">
          <h3 className="mktBizName">{biz.name}</h3>
          <span className={`mktOpenBadge ${biz.open ? "mktOpen" : "mktClosed"}`}>
            {biz.open ? "Open" : "Closed"}
          </span>
        </div>
        <p className="mktBizTagline">{biz.tagline}</p>
        <div className="mktBizMeta">
          <Stars rating={biz.rating} />
          <span className="mktBizRating">{biz.rating}</span>
          <span className="mktBizReviews">({biz.reviews})</span>
          <span className="mktBizDot">·</span>
          <span className="mktBizDist">{biz.distance}</span>
        </div>
        <div className="mktBizTags">
          {biz.tags.map((t) => (
            <span key={t} className="mktBizTag">{t}</span>
          ))}
        </div>
      </div>
      <button className="mktBizCta" type="button">View →</button>
    </div>
  );
}

// ─── Category Tile ────────────────────────────────────────────────────────────
function CategoryTile({
  cat,
  active,
  onClick,
}: {
  cat: typeof CATEGORIES[number];
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
      <span className="mktCatIcon">{cat.icon}</span>
      <span className="mktCatLabel">{cat.label}</span>
      <span className="mktCatCount">{cat.count}</span>
    </button>
  );
}

// ─── Marketplace App ──────────────────────────────────────────────────────────
export function MarketplaceApp() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const visible = BUSINESSES.filter((b) => {
    const matchCat  = !activeCategory || b.category === activeCategory;
    const matchSearch = !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.tagline.toLowerCase().includes(search.toLowerCase()) ||
      b.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="mktApp">

      {/* ── Hero strip ── */}
      <div className="mktHero">
        <div className="mktHeroInner">
          <h2 className="mktHeroTitle">Local Marketplace</h2>
          <p className="mktHeroSub">
            Discover businesses, book services, grab deals — all in your neighbourhood.
          </p>
          <div className="mktSearchWrap">
            <span className="mktSearchIcon">🔍</span>
            <input
              className="mktSearchInput"
              type="search"
              placeholder="Search businesses, services, cuisines…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search marketplace"
            />
          </div>
        </div>
      </div>

      {/* ── Category tiles ── */}
      <section className="mktSection">
        <div className="mktSectionHeader">
          <h3 className="mktSectionTitle">Browse by category</h3>
          {activeCategory && (
            <button
              type="button"
              className="mktClearFilter"
              onClick={() => setActiveCategory(null)}
            >
              Clear filter ×
            </button>
          )}
        </div>
        <div className="mktCatGrid">
          {CATEGORIES.map((cat) => (
            <CategoryTile
              key={cat.id}
              cat={cat}
              active={activeCategory === cat.id}
              onClick={() =>
                setActiveCategory(activeCategory === cat.id ? null : cat.id)
              }
            />
          ))}
        </div>
      </section>

      {/* ── Business listings ── */}
      <section className="mktSection">
        <div className="mktSectionHeader">
          <h3 className="mktSectionTitle">
            {activeCategory
              ? CATEGORIES.find((c) => c.id === activeCategory)?.label
              : "All businesses"}
          </h3>
          <span className="mktResultCount">{visible.length} results</span>
        </div>

        {visible.length === 0 ? (
          <div className="mktEmpty">
            <span className="mktEmptyIcon">🔍</span>
            <p>No businesses match your search. Try a different term or category.</p>
          </div>
        ) : (
          <div className="mktBizGrid">
            {visible.map((biz) => (
              <BusinessCard key={biz.id} biz={biz} />
            ))}
          </div>
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
