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
*   **Placement:** A dedicated "News" or "Daily Brief" micro-app tile, or a scrolling ticker/feed integrated into the main dashboard shell.
*   **Design:** Clean, minimalist cards. The AI summaries allow users to get the gist without clicking away, keeping them on the platform longer.

---

## 3. Seamless In-Game Banner Ads

### Overview
Monetization within the high-engagement game scorecard apps (Poker, Rummy, Tambola, Bingo) without disrupting gameplay.

### Architecture & Data Model
*   **Delivery:** The experience layer fetches contextual ads from the API based on the current micro-app (e.g., snack ads during Poker).
*   **Tracking:** Simple impression and click tracking logged back to the API.

### User Experience (UX) Integration
*   **Crucial Constraint:** Ads *must not* interrupt the core loop of the game (e.g., entering a score, calling a number).
*   **Placement Strategies:**
    *   **Scorecards (Poker/Rummy):** Place a slim, static banner at the very bottom of the screen (above the sticky footer, if applicable) or subtly integrated between rows on the scorecard every 5-10 rounds.
    *   **Tambola/Bingo:** Place the banner next to the called number board or during the "waiting for next game" state.
*   **Design:** Native UI styling. For example, instead of a standard Google AdSense block, use a custom component that looks like a MetroHub notification: *"Running low on snacks? Tap here for 15% off quick delivery."*
*   **Interaction:** Clicking the ad should ideally open a quick-buy modal or slide-over panel, rather than navigating the user entirely away from their active game state.
