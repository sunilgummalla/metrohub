# MetroHub Advertiser Portal — TODO

## Phase 1: Schema & Backend
- [x] Design and apply database schema (users extension, ad_slots, campaigns, bookings, presence_hourly, creatives)
- [x] Seed ad slot definitions (6 units: hero-banner, news-ticker, poker-scorecard-footer, rummy-scorecard-footer, tambola-sidebar, bingo-sidebar)
- [x] tRPC: auth.me, auth.logout (already scaffolded)
- [x] tRPC: membership.upgrade, membership.currentTier
- [x] tRPC: presence.live — real-time concurrent users per app
- [x] tRPC: presence.historical — hourly aggregates with day/week/year filters (Pro only)
- [x] tRPC: slots.list — all 6 slots with live counts and pricing
- [x] tRPC: slots.availability — calendar availability for a given slot
- [x] tRPC: bookings.create — slot booking with creative upload + payment session
- [x] tRPC: bookings.list — advertiser's own bookings
- [x] tRPC: campaigns.list — impressions, clicks, CTR per campaign
- [x] tRPC: campaigns.stats — aggregate stats for own campaigns
- [x] tRPC: ai.chat — AI assistant with per-member data isolation (query + LLM layers)
- [x] Payment adapter: provider-agnostic interface (Stripe primary, PayPal secondary)
- [x] Payment webhook handler for booking confirmation
## Phase 2: Frontend — Global Theme & Layout
- [x] Global theme: Space Grotesk + Inter fonts, indigo/amber/slate palette, light mode default
- [x] DashboardLayout sidebar with 6 sections: Overview, Live Audience, Ad Slots, My Campaigns, AI Assistant, Account & Billing
- [x] Auth guard: redirect unauthenticated users to landing/login page
- [x] Upsell modal component (reusable, triggered by Pro-gated features)
## Phase 3: Frontend — Pages
- [x] Landing/login page (public) with sign-in CTA
- [x] Overview page: KPI cards (active campaigns, total spend, total impressions, CTR), quick stats
- [x] Live Audience page: real-time heatmap tiles per app with auto-refresh (30s)
- [x] Historical Analytics page: 3-year trend charts (Pro only, upsell modal for Basic)
- [x] Ad Slots page: 6 slot cards with live counts, pricing, availability, Book CTA
- [x] Booking flow: date/time picker, creative upload, payment checkout
- [x] My Campaigns page: table of campaigns with impressions, clicks, CTR, status badges
- [x] AI Assistant page: chat interface (Pro only, upsell modal for Basic)
- [x] Account & Billing page: profile, tier badge, upgrade CTA, payment history
## Phase 4: Tests & Polish
- [x] Vitest: membership tier gating procedure
- [x] Vitest: AI assistant data isolation (memberId filter)
- [x] Vitest: payment adapter factory (returns correct adapter per env var)
- [x] Vitest: slots.list returns all 6 canonical slot IDs
- [x] Screenshot verification of all pages
- [x] Checkpoint and delivery
