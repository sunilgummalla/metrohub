# Engagement & Monetization Features Specification

This document outlines the architecture, user experience, and integration strategy for three new engagement and monetization features on MetroHub:
1. Admin-managed Hero Banner Ads
2. AI-powered and Admin-curated News Feed
3. Seamless In-game Banner Ads

The core philosophy across all these features is **seamless integration**. Ads and content must enhance the user experience rather than distract or annoy users.

---

## 1. Admin-Managed Hero Banner Ads

### Overview
A dynamic hero banner system located at the top of the MetroHub shell (or specific high-traffic app landing pages) to promote internal features, local services, or high-value impulse buys.

### Architecture & Data Model
*   **Storage:** Managed via the NestJS API (MongoDB).
*   **Fields:** `id`, `imageUrl`, `title`, `subtitle`, `ctaText`, `targetUrl`, `startDate`, `endDate`, `isActive`, `priority`, `targetApps` (array of app IDs where the banner should appear).
*   **Admin Interface:** A simple, usability-focused CRUD interface in the admin portal allowing staff to upload images, set active dates, and assign priority.

### User Experience (UX) Integration
*   **Placement:** Top of the shell or immediately below the sticky header.
*   **Design:** Must feel native to the MetroHub UI. Avoid generic "ad-like" borders. Use rounded corners, soft shadows, and typography that matches the platform.
*   **Behavior:** Auto-rotating carousel (if multiple are active), but with a slow, smooth transition (e.g., 5-7 seconds) so it is not distracting. Users can manually swipe or click through.

---

## 2. AI-Powered & Admin-Curated News Feed

### Overview
A news feed providing local and international news to give users a reason to visit MetroHub daily, even when they aren't playing games.

### Architecture & Data Model
*   **Ingestion:** A background job in the NestJS API that fetches news from external RSS feeds or APIs (e.g., NewsAPI).
*   **AI Processing:** Before saving to the database, an AI service (e.g., OpenAI API) processes the raw articles to:
    1.  Categorize them (Local, International, Sports, Tech).
    2.  Summarize them into bite-sized, 2-3 sentence snippets for quick reading.
    3.  Filter out overly negative or controversial content to maintain a positive platform vibe.
*   **Admin Curation:** Admins can pin specific stories, hide articles, or manually add community announcements.

### User Experience (UX) Integration
*   **Placement:** A **scrolling news ticker** embedded in the main MetroHub shell, positioned between the sticky header and the app tile grid. It is always visible across the portal without requiring the user to navigate anywhere.
*   **Scroll Behaviour:** Headlines scroll continuously from right to left at a comfortable reading pace. Scrolling **pauses immediately on mouse hover** (or touch-hold on mobile), allowing the user to read the current headline at leisure. Scrolling resumes automatically when the cursor leaves or the touch is released.
*   **Interaction:** Each headline is a clickable link. On click, a slide-over panel or modal expands to show the AI-generated 2–3 sentence summary and a "Read full story" link, keeping the user on the platform rather than navigating away.
*   **Design:** The ticker strip uses a single-line height with a subtle background tint drawn from the MetroHub shell palette. Typography is small but legible. A category tag (e.g., **Local**, **Sports**, **Tech**) is prepended to each headline in a muted accent colour so users can scan relevance at a glance. No borders, no flashing — it must feel like a native part of the shell chrome.

---

## 3. Seamless In-Game Banner Ads

### Overview
Monetization within the high-engagement game scorecard apps (Poker, Rummy, Tambola, Bingo) without disrupting gameplay. Each placement within an app is treated as a distinct, sellable inventory unit.

### Architecture & Data Model
*   **Distinct Inventory Units:** In-game ad slots are managed entirely separately from Hero Banners. They have a lighter data model (e.g., icon + one-liner copy, or small 320x50 banner) optimized for the game context.
*   **Delivery:** The experience layer fetches contextual ads from the API based on the specific `slotId` requested by the micro-app (e.g., `poker-scorecard-footer`, `tambola-sidebar`).
*   **Tracking:** Simple impression and click tracking logged back to the API, grouped by `slotId`.

---

## 4. Real-Time Audience Presence & Advertiser Demand Engine

### Overview
To drive urgency and demand for ad slots, the platform tracks and exposes real-time concurrent user counts ("presence") per page and per ad slot. This allows local businesses to see exactly how many eyeballs are currently on a page and bid or buy accordingly.

### Architecture & Data Model
*   **Presence Tracking:** A WebSocket or Server-Sent Events (SSE) connection between the React shell/micro-apps and the NestJS API.
*   **Heartbeat:** Clients send a lightweight ping every 30 seconds containing their current `appId` and `route`.
*   **Aggregation:** The API maintains a real-time count of active connections per route in memory (e.g., Redis).

### User Experience (UX) Integration
*   **For Users (Player-facing):** A subtle social proof indicator in the shell or app header: *"🔥 42 people playing Rummy right now."* This creates a sense of community for the players, validates the platform's popularity, and indirectly demonstrates the value of the real estate to anyone looking at the screen.
*   **For Advertisers:** Handled separately in the Advertiser Member Portal (see portal architecture spec).

## 5. In-Game Banner Ad UX Constraints

### User Experience (UX) Integration
*   **Crucial Constraint:** Ads *must not* interrupt the core loop of the game (e.g., entering a score, calling a number).
*   **Placement Strategies:**
    *   **Scorecards (Poker/Rummy):** Place a slim, static banner at the very bottom of the screen (above the sticky footer, if applicable) or subtly integrated between rows on the scorecard every 5-10 rounds.
    *   **Tambola/Bingo:** Place the banner next to the called number board or during the "waiting for next game" state.
*   **Design:** Native UI styling. For example, instead of a standard Google AdSense block, use a custom component that looks like a MetroHub notification: *"Running low on snacks? Tap here for 15% off quick delivery."*
*   **Interaction:** Clicking the ad should ideally open a quick-buy modal or slide-over panel, rather than navigating the user entirely away from their active game state.
