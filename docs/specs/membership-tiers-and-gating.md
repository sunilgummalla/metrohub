# Membership Tiers & Feature Gating

To maximize adoption while driving recurring revenue, both the **Advertiser Member** and **Creator** tracks utilize a Freemium model. This document defines the feature gates and upgrade paths for both tracks.

---

## 1. Advertiser Membership Tiers

The Advertiser track is designed to bring businesses onto the platform by demonstrating immediate value through live audience data, while gating advanced analytics and high-value tools behind a subscription. 

The **Advertiser Basic (Free)** tier serves as an entry point. Businesses on this tier can browse the Live Inventory Dashboard to view current concurrent user counts. They are permitted to purchase standard ad slots, such as in-game banners, on a pay-as-you-go basis. While they can browse the Influencer Directory to see available local creators, they cannot initiate deals. Crucially, this tier lacks access to historical data, the Chainlit AI assistant, and premium ad real estate like Hero Banners.

The **Advertiser Pro (Premium)** tier unlocks the full capabilities of the platform. Subscribers gain complete access to both Live and Historical Inventory Dashboards, utilizing the full 3-year data retention policy. They can purchase all ad slots, including the high-visibility Hero Banners, and benefit from a priority booking window (e.g., booking 30 days in advance compared to 7 days for Basic users). Furthermore, Pro members can initiate unlimited deals within the Influencer Directory and have unrestricted access to the Chainlit Business Intelligence Assistant for complex campaign queries.

| Feature | Advertiser Basic (Free) | Advertiser Pro (Premium) |
|---|---|---|
| **Inventory Dashboard** | Live counts only | Live + 3-year historical trends |
| **Ad Purchasing** | Standard slots only (pay-as-you-go) | All slots + Hero Banners + priority booking |
| **Influencer Marketplace** | Browse only | Unlimited deal initiation |
| **AI Assistant (Chainlit)** | None | Full access |

---

## 2. Creator Membership Tiers

The Creator track focuses on rapidly onboarding local influencers and verifying their reach through OAuth account linking. Once integrated into the ecosystem, the platform provides clear upgrade paths for creators who want to actively secure more deals.

The **Creator Basic (Free)** tier allows influencers to establish a verified presence. They can create a profile, link their social accounts to display authenticated metrics, and appear in the Influencer Directory. They are fully capable of receiving and accepting inbound deal proposals from Premium Advertisers. However, their profiles appear lower in search results, they cannot send proactive pitches to businesses, and they do not have access to profile view analytics.

The **Creator Pro (Premium)** tier is designed for influencers treating their presence as a business. Subscribers receive priority ranking in the Influencer Directory, ensuring they are seen first by advertisers. This tier unlocks the "Proactive Pitching" booster, granting the creator the ability to send reverse pitches directly to businesses. Additionally, Pro creators gain access to profile analytics (e.g., identifying which local restaurants viewed their profile) and receive a monthly allocation of Booster credits, such as one "Profile Highlight" per month.

| Feature | Creator Basic (Free) | Creator Pro (Premium) |
|---|---|---|
| **Directory Placement** | Standard ranking | Priority ranking |
| **Deal Flow** | Inbound only | Inbound + Proactive Pitching (outbound) |
| **Profile Analytics** | None | Full visibility on profile views |
| **Booster Credits** | Pay-as-you-go | Monthly allocation included |

---

## 3. The Upsell Strategy (In-App Prompts)

The platform relies on contextual, just-in-time upsells rather than hard paywalls. The goal is to present the upgrade option precisely when the user is experiencing friction or desiring a specific outcome.

For **Advertisers**, the upsell occurs during the data discovery phase. When a Free Advertiser views a specific ad slot and attempts to click a "Compare historical performance" or "Ask AI" button, a modal appears explaining that unlocking 3 years of historical data and AI insights requires an upgrade to Advertiser Pro.

For **Creators**, the upsell is tied to proactive deal-making. When a Free Creator notices a local business running an ad on the platform and wishes to pitch them directly, clicking a "Pitch this Business" button triggers an upgrade prompt. The prompt highlights that unlocking proactive pitching and securing priority directory ranking requires Creator Pro.
