# Portal Architecture: Admin vs. Advertiser Member

To support the self-serve monetization engine, MetroHub separates the management of the platform into two distinct portals: an **Admin Portal** for internal staff and an **Advertiser Member Portal** for external businesses.

## 1. The Advertiser Member Portal (Self-Serve)

The Advertiser Member Portal is a self-serve platform where local businesses, event organizers, and vendors can independently manage their advertising campaigns on MetroHub.

### Key Workflows
1.  **Enrollment & Authentication:** Businesses sign up and log in using standard member authentication providers (Google, Facebook, Microsoft).
2.  **Live & Historical Inventory Dashboard:** The core data feature. Advertisers see both a live heatmap of the MetroHub ecosystem and historical trend data.
    *   *Live Example:* "145 active users on Poker Scorecard right now."
    *   *Historical Example:* "Last Friday between 8 PM - 10 PM, Poker Scorecard peaked at 210 concurrent users."
3.  **AI Business Intelligence Assistant (Chainlit):** An embedded AI chat interface powered by Chainlit. This is an **Advertiser Pro** feature — Advertiser Basic (Free) members do not have AI access (see [membership-tiers-and-gating.md](./membership-tiers-and-gating.md)). The sections below describe the assistant's behavior for Pro members.

    **Access Policy — Strict Data Isolation:**
    The assistant enforces a two-tier data access model on every query, regardless of how the question is phrased.

    | Data Category | What the Advertiser Can See | What is Blocked |
    |---|---|---|
    | **Own campaigns** | Full detail — impressions, clicks, CTR, spend, creative performance, slot history | N/A |
    | **Platform traffic** | General aggregated stats — total concurrent users per app, peak hours, day-of-week trends | Competitor spend, competitor CTR, competitor creative details |
    | **Other businesses** | Nothing — zero visibility | All campaign data, identity, slot bookings, and performance of any other advertiser |

    This isolation is enforced at the query layer, not just the UI layer. The Chainlit service receives the authenticated advertiser's `memberId` on every session and injects it as a mandatory filter on all database queries. The LLM prompt also includes a system instruction that explicitly prohibits it from speculating about, inferring, or revealing any information about other advertisers, even indirectly.

    **Example Queries the Assistant Can Answer:**
    *   *"What is the best 2-hour window on weekends to reach the most Tambola users?"* (platform traffic — allowed)
    *   *"How did my Poker footer slot perform last month?"* (own campaign — allowed)
    *   *"If I book the hero banner next Friday evening, what audience size can I expect based on history?"* (platform traffic — allowed)
    *   *"Which of my slots had the highest click-through rate in the last 90 days?"* (own campaign — allowed)

    **Example Queries the Assistant Will Decline:**
    *   *"What is the other business running on the Tambola sidebar spending?"* (blocked — competitor data)
    *   *"Who else is advertising on the Poker scorecard?"* (blocked — competitor identity)
4.  **Slot Browsing & Purchasing:**
    *   Advertisers browse available `slotIds` (e.g., `hero-banner`, `poker-scorecard-footer`, `news-ticker`).
    *   They can select dates, times, and specific slots based on the live presence data and historical trends.
    *   They upload their creative (image/copy) directly through the portal.
    *   They complete the transaction via the configured payment gateway.

### Payment Gateway Architecture

Payment processing is designed as a **configurable, provider-agnostic integration** in the NestJS API. The supported providers at launch are **Stripe** and **PayPal**. The active provider is controlled by a single environment variable (`PAYMENT_PROVIDER=stripe` or `PAYMENT_PROVIDER=paypal`), allowing the platform to switch providers without any code changes.

**Provider Abstraction:**
The API exposes a `PaymentService` interface with standard methods (`createCheckoutSession`, `handleWebhook`, `refund`). Each provider (Stripe, PayPal) implements this interface in its own adapter class. The correct adapter is resolved at runtime based on the environment configuration.

| Concern | Stripe | PayPal |
|---|---|---|
| **Checkout flow** | Stripe Checkout (hosted) or Payment Element | PayPal Smart Payment Buttons |
| **Webhook events** | `payment_intent.succeeded`, `charge.refunded` | `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED` |
| **Refunds** | Stripe Refunds API | PayPal Refund API |
| **Config keys** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` |

The Member Portal frontend renders the appropriate payment UI component based on the active provider returned by the API, ensuring the checkout experience is always consistent with the configured gateway.
5.  **Campaign Performance:** A simple analytics view showing impressions, clicks, and conversion rates (if tracked) for their active and past campaigns.

### UX Philosophy
The Advertiser Portal must feel like a modern SaaS product (e.g., Facebook Ads Manager, but radically simpler). The focus is on showing the live audience value immediately to trigger a purchase.

---

## 2. The Admin Portal (Internal Control)

The Admin Portal is strictly for MetroHub internal staff to oversee, moderate, and fine-tune the platform.

### Key Workflows
1.  **Authentication:** Strictly limited to internal staff via Entra (Azure AD).
2.  **Ad Moderation & Approval:**
    *   All self-serve ads purchased via the Advertiser Portal enter a "Pending" queue.
    *   Admins review the creative for appropriateness and alignment with the platform's theme before setting the status to "Approved/Active."
3.  **Inventory & Pricing Control:**
    *   Admins define which `slotIds` are available for purchase.
    *   Admins set the base pricing or dynamic pricing rules for slots (e.g., higher prices for Friday evenings).
4.  **News Feed Curation:** Admins review the AI-processed news feed, pin important community announcements, and hide inappropriate articles.
5.  **Override & Emergency Stop:** Admins have the power to instantly pause any active campaign or revoke an advertiser's access.

### UX Philosophy
Usability over aesthetics. The Admin Portal should be a dense, data-rich interface optimized for speed, moderation queues, and rapid configuration changes.

---

## 3. Data Retention Policy

All presence data (concurrent user counts per route, per time interval) and campaign performance data (impressions, clicks, conversions) are retained for **3 years** from the date of collection.

### Storage Architecture

| Data Type | Granularity Stored | Retention | Notes |
|---|---|---|---|
| **Live presence** | Raw heartbeat events (30-second intervals) | 7 days | Used for real-time counts; purged after short window |
| **Aggregated presence** | Hourly counts per route | 3 years | Pre-aggregated from raw events before purge; primary dataset for Chainlit and historical charts |
| **Campaign impressions** | Per-impression log | 3 years | Enables granular performance replay |
| **Campaign clicks** | Per-click log | 3 years | Enables CTR analysis over any time window |

The 3-year retention window allows the Chainlit AI assistant to answer seasonal and year-over-year questions with high confidence — for example, comparing this Diwali season's Tambola traffic against the previous two years. Raw heartbeat events are aggregated into hourly buckets before the short-term purge, ensuring no meaningful data is lost while keeping storage costs manageable.
