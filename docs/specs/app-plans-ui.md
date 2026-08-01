# Plans & Pricing Page UI Specification (`app-plans`)

The `app-plans` micro-app serves as the public-facing portal for membership enrollment. Because MetroHub caters to two distinct B2B audiences (Advertisers and Creators), the UI must immediately segment the user to show the relevant pricing options.

## 1. Page Layout & Segmentation

The page utilizes a top-level toggle switch to cleanly separate the two audiences, preventing feature clutter and confusion.

### The Audience Toggle
Located immediately below the page title ("Choose Your Path"), a large, pill-shaped toggle switch allows the user to select their identity. The default selection is **[ I am a Business ]**, with the alternative being **[ I am a Creator ]**. Toggling this switch dynamically swaps the pricing cards displayed below it, ensuring users only see the information relevant to their goals.

---

## 2. Business (Advertiser) View

When "I am a Business" is selected, two primary pricing cards are displayed side-by-side.

The **Advertiser Basic (Free)** card focuses on low-friction entry for local businesses wanting to experiment with the platform. It targets local shops testing the waters. The call to action is "Start Advertising," which leads directly to the Member Portal signup flow.

The **Advertiser Pro (Premium)** card is visually highlighted with a subtle border glow and a "Most Popular" badge. It focuses on data access and high-value placements, targeting agencies, event organizers, and active local brands. The call to action is "Upgrade to Pro," leading to the checkout flow.

| Feature | Advertiser Basic ($0/mo) | Advertiser Pro (Paid/mo) |
|---|---|---|
| **Audience Insights** | Browse live concurrent user counts | Unlock 3 years of historical traffic data |
| **Ad Purchasing** | Purchase standard ad slots (pay-as-you-go) | Purchase premium Hero Banners and priority slots |
| **Influencer Marketplace** | Browse the local Influencer Directory | Initiate unlimited deals with local influencers |
| **AI Capabilities** | Not included | Access the Chainlit AI Business Assistant |

---

## 3. Creator View

When "I am a Creator" is selected, the pricing cards swap to reflect the influencer track.

The **Creator Basic (Free)** card focuses on establishing a verified presence to attract inbound deals. It targets micro-influencers building their portfolio. The call to action is "Create Free Profile," leading to the Creator onboarding flow.

The **Creator Pro (Premium)** card focuses on proactive outreach and directory visibility. It targets career influencers and active deal-seekers. The call to action is "Go Pro," leading to the checkout flow.

| Feature | Creator Basic ($0/mo) | Creator Pro (Paid/mo) |
|---|---|---|
| **Profile Visibility** | Listed in the Advertiser Discovery Directory | Priority ranking in directory search results |
| **Deal Flow** | Receive and accept inbound deals | Unlock proactive pitching to businesses |
| **Analytics** | Verified Creator Profile with OAuth metrics | Detailed profile view analytics |
| **Perks** | Not included | Includes 1 "Profile Highlight" Booster per month |

---

## 4. The Booster Add-ons Section

Below the primary pricing cards on both views, an "A la Carte Add-ons" section is displayed. This section is tailored to the active toggle and clarifies that certain high-value actions are transactional, not subscription-bound.

When viewing the Business track, the section displays ad slot pricing examples, such as "In-game banners starting at $X/day." When viewing the Creator track, the section displays Booster pricing examples, such as "Additional Profile Highlights: $X/each" or "Pitch Packs: $X for 10."

## 5. Design Alignment

The entire page must strictly adhere to the overarching MetroHub design language, ensuring 100% alignment with the visual theme established by `ataseattle.org` (e.g., typography, primary/accent colors, and rounded component styling). The design should feel professional, trustworthy, and heavily optimized for conversion.
