# Portal Architecture: Admin vs. Advertiser Member

To support the self-serve monetization engine, MetroHub separates the management of the platform into two distinct portals: an **Admin Portal** for internal staff and an **Advertiser Member Portal** for external businesses.

## 1. The Advertiser Member Portal (Self-Serve)

The Advertiser Member Portal is a self-serve platform where local businesses, event organizers, and vendors can independently manage their advertising campaigns on MetroHub.

### Key Workflows
1.  **Enrollment & Authentication:** Businesses sign up and log in using standard member authentication providers (Google, Facebook, Microsoft).
2.  **Live & Historical Inventory Dashboard:** The core data feature. Advertisers see both a live heatmap of the MetroHub ecosystem and historical trend data.
    *   *Live Example:* "145 active users on Poker Scorecard right now."
    *   *Historical Example:* "Last Friday between 8 PM - 10 PM, Poker Scorecard peaked at 210 concurrent users."
3.  **AI Business Intelligence Assistant (Chainlit):** An embedded AI chat interface powered by Chainlit. Advertisers can ask natural language queries to make calculated buying decisions.
    *   *Example Query:* "What is the best time slot to reach the most users on the Tambola app on weekends?"
    *   *Example Query:* "How did the Poker footer slot perform last month during the 7-9 PM window?"
4.  **Slot Browsing & Purchasing:**
    *   Advertisers browse available `slotIds` (e.g., `hero-banner`, `poker-scorecard-footer`, `news-ticker`).
    *   They can select dates, times, and specific slots based on the live presence data and historical trends.
    *   They upload their creative (image/copy) directly through the portal.
    *   They complete the transaction via an integrated payment gateway.
4.  **Campaign Performance:** A simple analytics view showing impressions, clicks, and conversion rates (if tracked) for their active and past campaigns.

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
