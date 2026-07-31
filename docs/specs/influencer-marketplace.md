# Influencer Marketplace Specification

The Influencer Marketplace is a two-sided platform within MetroHub designed to connect local businesses (advertisers) with local social media influencers (creators) to facilitate mutually beneficial marketing deals.

## 1. Overview & Value Proposition

*   **The Problem:** Businesses struggle to find local influencers whose audience actually overlaps with their target demographic. Influencers struggle to find local businesses willing to sponsor them or provide perks.
*   **The Solution:** MetroHub acts as the matchmaking ground. Because MetroHub already has the business's attention (via the Advertiser Portal) and the local user's attention (via the gaming utilities), it is perfectly positioned to broker these relationships.

## 2. The Two-Sided Experience

### For Influencers (The "Creator" Profile)
1.  **Onboarding:** Influencers sign up via the standard Member Portal but opt into a "Creator Profile."
2.  **Account Linking:** They securely link their social accounts (Instagram, TikTok, YouTube) via OAuth to verify their identity and automatically pull in core metrics (follower count, engagement rate).
3.  **Audience Demographics:** They can manually declare or auto-sync their primary audience location (e.g., "Seattle Metro") and niche (e.g., "Foodie", "Lifestyle", "Gaming").
4.  **The "Pitch":** They define what they offer (e.g., "1 Reel + 2 Stories") and what they expect in return (e.g., "$200" or "Free dinner for two").

### For Businesses (The "Advertiser" View)
1.  **Discovery Directory:** Inside the Advertiser Member Portal, businesses have a "Find Creators" tab.
2.  **Filtering & Search:** They can filter creators by niche, location, follower tier (Micro, Macro), and expected compensation type (Cash vs. Barter).
3.  **Performance Metrics:** They view the creator's verified metrics directly from the API, preventing fraudulent or inflated follower claims.

## 3. The Matchmaking & Deal Flow

1.  **The Outreach:** A business finds an influencer they like and clicks "Propose Deal."
2.  **The Brief:** The business fills out a simple brief: what they want promoted, the timeline, and the offer (cash amount or specific barter item).
3.  **Negotiation & Acceptance:** The influencer receives a notification, reviews the brief, and can accept, decline, or counter-offer.
4.  **Execution & Proof:** Once accepted, the influencer executes the campaign and uploads the link to the live post into the portal as "Proof of Execution."
5.  **Payment/Fulfillment:** If it is a cash deal, MetroHub can hold the funds in escrow (via Stripe Connect) and release them upon proof of execution, taking a small platform fee.

## 4. Integration with the Chainlit AI Assistant

The Chainlit AI assistant in the Advertiser Portal is aware of the Influencer directory.
*   *Example Query:* "Which local food influencers have an engagement rate above 5% and accept barter deals?"
*   *Example Query:* "Based on my previous ad campaigns for the Tambola app, which influencers have an audience that matches my demographic?"

## 5. Architecture & Data Model

*   **`CreatorProfile` Collection:** Linked to the base `Member` record. Stores social handles, verified metrics, niche tags, and rate cards.
*   **`Deal` Collection:** Tracks the lifecycle of a matchmaking event (`Proposed`, `Negotiating`, `Accepted`, `Executed`, `Completed`, `Cancelled`).
*   **External APIs:** Integration with Instagram Graph API / TikTok API for metric verification.
