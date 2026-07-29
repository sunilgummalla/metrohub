import React, { useEffect, useState } from "react";
import "./plans.css";

// ─── Types ───────────────────────────────────────────────────────────────────

type Currency = "INR" | "USD" | "CAD";

interface Plan {
  planId: string;
  name: string;
  intervalDays: number;
  prices: Record<Currency, number>;
  features: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
  CAD: "CA$",
};

const CURRENCY_LABELS: Record<Currency, string> = {
  INR: "INR ₹",
  USD: "USD $",
  CAD: "CAD CA$",
};

function formatPrice(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const value = amount / 100;
  if (value === 0) return "Free";
  return `${symbol}${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
}

function intervalLabel(days: number): string {
  if (days === 0) return "forever";
  if (days === 30) return "/ month";
  if (days === 365) return "/ year";
  return `/ ${days} days`;
}

const STATIC_PLANS: Plan[] = [
  {
    planId: "free",
    name: "Free",
    intervalDays: 0,
    prices: { INR: 0, USD: 0, CAD: 0 },
    features: [
      "Up to 3 simultaneous games",
      "Tambola, Bingo & Rummy scorecard",
      "Guest join by code",
      "24-hour game history",
    ],
  },
  {
    planId: "pro_monthly",
    name: "Pro",
    intervalDays: 30,
    prices: { INR: 9900, USD: 199, CAD: 249 },
    features: [
      "Unlimited simultaneous games",
      "All Free features",
      "Full game history & archives",
      "Custom player handles",
      "Priority support",
    ],
  },
  {
    planId: "family_monthly",
    name: "Family",
    intervalDays: 30,
    prices: { INR: 24900, USD: 499, CAD: 649 },
    features: [
      "Everything in Pro",
      "Up to 10 named players per game",
      "Persistent player profiles",
      "Game statistics & leaderboards",
      "Early access to new games",
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

const VALID_CURRENCIES: Currency[] = ["INR", "USD", "CAD"];

function parseCurrency(raw: string | null): Currency {
  if (raw && VALID_CURRENCIES.includes(raw as Currency)) {
    return raw as Currency;
  }
  return "INR";
}

/** Safe localStorage helpers — no-op in Safari private mode or restricted envs */
function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — ignore */
  }
}

export function PlansApp() {
  const [currency, setCurrency] = useState<Currency>(() =>
    parseCurrency(lsGet("plans-currency"))
  );
  const [plans, setPlans] = useState<Plan[]>(STATIC_PLANS);

  // Persist currency preference
  useEffect(() => {
    lsSet("plans-currency", currency);
  }, [currency]);

  // Try to fetch live plans from the API; fall back to static data silently
  useEffect(() => {
    const apiBase =
      (import.meta as unknown as { env: Record<string, string> }).env
        ?.VITE_API_URL ?? "/api";
    fetch(`${apiBase}/plans`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setPlans(data as Plan[]);
      })
      .catch(() => {
        /* silently use static data */
      });
  }, []);

  return (
    <div className="plansApp">
      {/* Header */}
      <div className="plansHeader">
        <h1 className="plansTitle">Simple, transparent pricing</h1>
        <p className="plansSubtitle">
          All features are{" "}
          <strong>free during our beta</strong>. Prices below reflect our
          planned post-beta rates — shown for transparency.
        </p>

        {/* Currency switcher */}
        <div className="currencySwitcher">
          {(["INR", "USD", "CAD"] as Currency[]).map((c) => (
            <button
              key={c}
              className={`currencyBtn${currency === c ? " active" : ""}`}
              onClick={() => setCurrency(c)}
            >
              {CURRENCY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Plans grid */}
      <div className="plansGrid">
        {plans.map((plan) => {
          const isFree = plan.prices[currency] === 0;
          const isPro = plan.planId === "pro_monthly";
          return (
            <div
              key={plan.planId}
              className={`planCard${isPro ? " planCardFeatured" : ""}`}
            >
              {isPro && <div className="planBadge">Most Popular</div>}

              <div className="planName">{plan.name}</div>

              {/* Price — struck through with "Free during beta" badge */}
              <div className="planPricing">
                {isFree ? (
                  <span className="planPrice">Free</span>
                ) : (
                  <>
                    <span className="planPriceStrike">
                      {formatPrice(plan.prices[currency], currency)}
                    </span>
                    <span className="planInterval">
                      {intervalLabel(plan.intervalDays)}
                    </span>
                  </>
                )}
              </div>

              {!isFree && (
                <div className="planBetaBadge">Free during beta</div>
              )}

              {/* Features */}
              <ul className="planFeatures">
                {plan.features.map((f) => (
                  <li key={f} className="planFeatureItem">
                    <span className="planFeatureCheck">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className={`planCta${isPro ? " planCtaFeatured" : ""}`}
                disabled
                title="Coming soon — all features are free during beta"
              >
                {isFree ? "Current plan" : "Coming soon"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="plansFootnote">
        Prices shown are planned post-beta rates. All features remain free
        until we announce a launch date. No credit card required.
      </p>
    </div>
  );
}
