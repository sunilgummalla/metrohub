# MetroHub Feature Specification
## Community Boards & Storefront Marketplace

**Version:** 1.0  
**Status:** Draft for Review  
**Author:** Manus AI  
**Date:** August 2026

---

## Table of Contents

1. [Community Boards](#1-community-boards)
   - 1.1 [Overview & Core Concepts](#11-overview--core-concepts)
   - 1.2 [Board Governance & Access Control](#12-board-governance--access-control)
   - 1.3 [Thread Lifecycle](#13-thread-lifecycle)
   - 1.4 [AI Deduplication & Moderation Flow](#14-ai-deduplication--moderation-flow)
   - 1.5 [Cross-Posting](#15-cross-posting)
   - 1.6 [Notifications & Subscriptions](#16-notifications--subscriptions)
   - 1.7 [Paid Boards](#17-paid-boards)
   - 1.8 [Data Model](#18-data-model)
2. [Storefront Marketplace](#2-storefront-marketplace)
   - 2.1 [Overview & Relationship to Vendor Profiles](#21-overview--relationship-to-vendor-profiles)
   - 2.2 [Product & Service Lifecycle](#22-product--service-lifecycle)
   - 2.3 [Inventory Management](#23-inventory-management)
   - 2.4 [Payments & Platform Fees](#24-payments--platform-fees)
   - 2.5 [Reviews & Ratings](#25-reviews--ratings)
   - 2.6 [Fulfillment & Carrier Integration](#26-fulfillment--carrier-integration)
   - 2.7 [Data Model](#27-data-model)
3. [Cross-Feature Constraints](#3-cross-feature-constraints)
4. [Phasing & Delivery Roadmap](#4-phasing--delivery-roadmap)

---

## 1. Community Boards

### 1.1 Overview & Core Concepts

Community Boards provide a structured, AI-assisted forum experience within MetroHub. They are conceptually similar to Reddit communities or Facebook Groups, but with three defining characteristics that set them apart: aggressive AI-driven deduplication that prevents redundant threads, cross-board thread linking that allows a single conversation to surface in multiple relevant contexts, and a flexible governance model that ranges from fully open boards to strictly moderated or paid-access boards.

The core entities are **Boards**, **Threads**, and **Posts**. A Board is a top-level thematic container (e.g., "Housing", "Local Jobs", "Community Events"). A Thread is a single conversation on a specific topic within one or more boards. A Post is an individual reply within a thread. The critical design constraint is that **only one active thread per topic may exist per board at any time.** This is enforced by the AI deduplication system rather than by rigid keyword matching.

### 1.2 Board Governance & Access Control

Boards are not created by users. Only administrators can create boards. Users may submit a **Board Request** which is reviewed by an admin; if approved, the admin creates the board and explicitly assigns a moderator. The user who submitted the request is not automatically granted moderator status.

Each board carries a **governance flag** that determines how content is controlled:

| Flag | Description | Who Controls Content |
| :--- | :--- | :--- |
| **Open** | Standard community forum. AI moderation runs post-publish. | All members |
| **Moderator Controlled** | New threads require moderator approval before publishing. | Moderators + AI |
| **Admin Controlled** | Strictest level. Admins configure all rules and may post announcements. | Admins only |
| **Business Controlled** | Owned by a specific vendor for customer engagement (e.g., a store's Q&A board). | Vendor + Moderators |

A board may have zero or more assigned moderators. Boards without a moderator rely entirely on AI moderation and admin oversight.

**Anonymous Posting** is disabled by default on all boards. A moderator may request it be enabled (with written justification), and an admin may activate it either permanently or for a defined time window. This is a per-board setting.

### 1.3 Thread Lifecycle

A thread progresses through the following states:

```
Draft → Active → Locked → Archived
                ↑
           (re-opened by moderator/admin)
```

| State | Description |
| :--- | :--- |
| **Draft** | Created but not yet visible to users. Used by moderators for pre-approved boards. |
| **Active** | Visible and open for new replies. Only one active thread per topic per board. |
| **Locked** | Visible but no new replies accepted. Moderator/admin action. |
| **Archived** | Hidden from default board view. AI deduplication no longer blocks new threads on this topic. |

The distinction between Locked and Archived is significant for the AI: a Locked thread still blocks new duplicate threads. An Archived thread does not — it signals that the topic is stale enough to warrant a fresh conversation.

### 1.4 AI Deduplication & Moderation Flow

The AI acts as a gatekeeper at two distinct points: **before a user submits a post** (deduplication) and **after a post is submitted** (content moderation).

#### Pre-submission Deduplication

When a user begins composing a new thread or query, the AI performs a real-time semantic search against all active threads on the target board (and optionally across all boards). The flow is as follows:

1. User types a query or thread title.
2. AI performs a semantic similarity search against active, non-archived threads.
3. **If a high-confidence match is found:** The AI presents an inline answer synthesised from the existing thread's content, along with a direct link to that thread. The user is informed that an active thread already covers this topic and is offered two primary actions: **reply to the existing thread**, or **request a distinct thread** (if they believe their query is genuinely different).
4. **If no match is found:** The user proceeds to the full post editor.
5. **If the user requests a distinct thread despite a match:** To preserve the *one active thread per topic per board* rule, a second **Active** thread is never auto-published while the matching thread is still Active. Instead, the request is routed into an override workflow:
   - **Moderated boards:** the post is saved as a **pending override request** and queued for moderator review. The moderator either approves it as a genuinely distinct thread (at which point it becomes Active) or redirects the author to reply on the existing thread.
   - **Open boards:** the post is held as a **draft pending lightweight moderator confirmation** (with an AI note linking the related thread), rather than published immediately. It only becomes Active once confirmed distinct; otherwise the author is prompted to reply on the existing thread.

#### Post-submission Content Moderation

After a post is submitted, the AI evaluates it against the board's rule set (keywords, topic restrictions, tone guidelines). The rule set is defined by admins and moderators and is continuously refined over time based on moderator override decisions. The AI takes one of the following actions:

Each AI decision maps to a stored `aiModerationStatus` value (`clear`, `flagged`, `blocked`) so the decision taxonomy and the persisted enum stay aligned:

| AI Decision | Stored `aiModerationStatus` | Action |
| :--- | :--- | :--- |
| **Clear** | `clear` | Post is published immediately. |
| **Suspicious** | `flagged` | Post is held pending moderator review. Author is notified. |
| **Promotional** | `blocked` | Post is blocked. Admin and moderator are alerted for review. |
| **Violation** | `blocked` | Post is blocked. Author is notified. Moderator/admin receives a detailed flag report. |

Promotional content — defined as any post that attempts to sell products, services, or drive traffic to a storefront — is always blocked in community boards. This boundary between Community Boards and the Marketplace is enforced by the AI and cannot be bypassed by users.

### 1.5 Cross-Posting

A thread can be linked to multiple boards simultaneously. This is useful when a topic is genuinely relevant to more than one community (e.g., a question about "affordable housing near downtown" is relevant to both a "Housing" board and a "Downtown Neighbourhood" board).

Cross-posting is managed by moderators or admins, not by users. When a thread appears on multiple boards, all replies are shared across all linked boards. Each reply is clearly badged with the name of the board from which it originated, so readers always know the community context of a given response.

### 1.6 Notifications & Subscriptions

Users can subscribe to either an entire **Board** or an individual **Thread**. Subscription triggers an in-app notification when:
- A new thread is posted on a subscribed board.
- A new reply is posted on a subscribed thread.
- A subscribed thread is locked or archived.

**Phase 1:** In-app notifications only.  
**Phase 2 (future):** Email digest and push notifications.

### 1.7 Paid Boards

The platform supports monetised boards in a future phase. The data model is designed to accommodate this from the outset. Paid boards will support the following billing configurations:

| Billing Cycle | Type |
| :--- | :--- |
| One-time entry fee | Member-pays |
| Monthly subscription | Member-pays or Owner-funded |
| Quarterly subscription | Member-pays or Owner-funded |
| Bi-annual (6-month) subscription | Member-pays or Owner-funded |
| Annual subscription | Member-pays or Owner-funded |
| 2-Year subscription | Member-pays or Owner-funded |

The key distinction is between **member-pays** boards (users pay to access) and **owner/moderator-funded** boards (the board owner pays MetroHub to host a premium board, and access may be free to members). Platform fee and revenue share rules will be defined per board.

### 1.8 Data Model

The following schemas extend the existing MetroHub MongoDB data layer.

**`Board`**

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | |
| `name` | String | Display name |
| `slug` | String | URL-safe identifier |
| `description` | String | |
| `categoryTag` | String | Admin-defined category |
| `governanceFlag` | Enum | `open`, `moderator`, `admin`, `business` |
| `adminId` | ObjectId | Owning admin |
| `moderatorIds` | ObjectId[] | Assigned moderators |
| `vendorId` | ObjectId? | Set when `governanceFlag = business` |
| `anonymousPostingEnabled` | Boolean | Default: false |
| `anonymousPostingExpiresAt` | Date? | Null = permanent |
| `aiRuleSet` | Object | Keywords, topic restrictions, tone rules |
| `subscriptionConfig` | Object? | Billing cycle, price — for paid boards (Phase 2) |
| `status` | Enum | `active`, `archived` |
| `createdAt` | Date | |

**`Thread`**

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | |
| `title` | String | |
| `body` | String | Original post content |
| `authorId` | ObjectId | |
| `isAnonymous` | Boolean | |
| `boardIds` | ObjectId[] | Supports cross-posting |
| `status` | Enum | `draft`, `active`, `locked`, `archived` |
| `aiModerationStatus` | Enum | `clear`, `flagged`, `blocked` |
| `aiModerationNotes` | String? | |
| `duplicateOfThreadId` | ObjectId? | Set when AI identifies a near-duplicate |
| `createdAt` | Date | |
| `lockedAt` | Date? | |
| `archivedAt` | Date? | |

**`Post`**

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | |
| `threadId` | ObjectId | |
| `originBoardId` | ObjectId | The board from which this reply was submitted |
| `authorId` | ObjectId | |
| `isAnonymous` | Boolean | |
| `content` | String | |
| `aiModerationStatus` | Enum | `clear`, `flagged`, `blocked` |
| `createdAt` | Date | |

**`BoardRequest`**

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | |
| `requesterId` | ObjectId | |
| `suggestedName` | String | |
| `description` | String | |
| `category` | String | |
| `justification` | String | |
| `status` | Enum | `pending`, `approved`, `rejected` |
| `reviewedByAdminId` | ObjectId? | |
| `assignedModeratorId` | ObjectId? | Set on approval |
| `createdAt` | Date | |

---

## 2. Storefront Marketplace

### 2.1 Overview & Relationship to Vendor Profiles

The Storefront Marketplace builds directly on top of the existing Vendor profile system (introduced in PR #25). A Vendor profile represents a business's identity on MetroHub — its name, description, categories, and geo-location. The Marketplace adds a **product and service catalogue** on top of that identity, transforming a directory listing into an active storefront.

Every vendor has a storefront, but a storefront is only commercially active when the vendor has at least one **Published** product or service. The marketplace browse and search interface surfaces only Published items. The vendor's own store page (`/store/[vendor-slug]`) surfaces all Listed items.

### 2.2 Product & Service Lifecycle

Products and services are managed through a four-state lifecycle. The four **persisted** states are `draft`, `listed`, `published`, and `unlisted` (matching `Product.status`). The states are not a simple linear progression — they represent independent visibility dimensions (storefront visibility vs. marketplace visibility). *Publish*, *unpublish*, *list*, *unlist*, and *re-list* are **transitions**, not states — in particular, **"unpublish" is a transition from `published` back to `listed`**, not a separate persisted state.

```
States: draft · listed · published · unlisted     (arrows are transitions)

draft ──list──▶ listed ──publish──▶ published
                  ▲  │                  │
         re-list  │  │ unlist           │ unpublish
                  │  ▼                  │
                unlisted ◀──────────────┘
                         (unlisting a published item unpublishes it first)
```

The rules are:

| Transition | Allowed? | Notes |
| :--- | :--- | :--- |
| Draft → Listed | Yes | Vendor action. Item appears on vendor's store page only. |
| Listed → Published | Yes | Vendor action. Item appears in global marketplace. |
| Published → Listed (unpublish) | Yes | Vendor action. Removes item from the global marketplace; it stays `listed` and visible on the vendor page. "Unpublish" is this transition, not a distinct state. |
| Listed → Unlisted | Yes | Removes from vendor page. If the item is currently `published`, unlisting first unpublishes it (`published` → `listed` → `unlisted`). |
| Unlisted → Listed | Yes | Vendor can re-list at any time. |
| Draft → Published | **No** | Must be Listed first. |

**Unlisting always implies Unpublishing.** A product cannot be visible in the global marketplace if it is not visible on the vendor's own store page.

### 2.3 Inventory Management

Vendors are responsible for maintaining accurate stock levels within the MetroHub portal. The system enforces the following rules:

- When a purchase is completed, inventory is decremented atomically.
- When inventory reaches zero, the product is automatically surfaced as "Out of Stock" and blocked from purchase. The item remains Listed/Published (visible) but cannot be added to a cart.
- Vendors receive an in-app alert when inventory falls below a configurable low-stock threshold.
- Inventory tracking applies to physical goods and capacity-limited services. Digital downloads and unlimited services may be configured as having unlimited inventory.

### 2.4 Payments & Platform Fees

MetroHub processes payments on behalf of vendors via **Stripe**. The payment flow is:

1. Buyer adds items to cart and proceeds to checkout.
2. MetroHub collects payment via Stripe.
3. MetroHub deducts the **platform fee** and initiates a payout to the vendor.

The platform fee is configurable at multiple levels:

| Level | Description |
| :--- | :--- |
| **Global default** | Set by MetroHub admin. Applies to all stores unless overridden. |
| **Store level** | Admin can set a custom fee for a specific vendor/store. |
| **Product/service level** | Admin can set a custom fee for a specific product or service category. |

Payment processing enablement is also configurable. An admin must explicitly enable MetroHub-managed payments at the store level (and optionally at the product level) before a vendor can accept payments through the platform. Vendors may also choose to handle payments externally, in which case MetroHub acts as a directory/listing service only.

### 2.5 Reviews & Ratings

The review system is strictly **verified-purchase only**. A user can only leave a review for a product or service if they have a completed order containing that item. This is enforced at the data layer — the review submission endpoint requires a valid `orderId` that belongs to the authenticated user and contains the target product.

All reviews are passed through AI moderation before publication. The AI checks for:
- Spam and fake reviews (e.g., repetitive language, suspicious posting patterns).
- Abusive or offensive language.
- Off-topic content.

Reviews that pass AI moderation are published immediately. Flagged reviews are held for human moderator review. Vendors cannot delete or suppress reviews, but they may report a review for re-evaluation.

### 2.6 Fulfillment & Carrier Integration

In the current phase, vendors manage their own delivery and fulfillment logistics outside of MetroHub. MetroHub records the fulfillment status on each order (e.g., `pending`, `processing`, `shipped`, `delivered`, `cancelled`) which vendors update manually or via API.

The data model is designed to accommodate future carrier integrations. MetroHub will eventually offer a **"Book My Delivery"** service, integrating with carrier platforms such as **ShipDay** and **Fleetbase** to provide last-mile delivery booking directly within the portal. The `Order` schema includes a `fulfillmentProvider` field and a `carrierTrackingRef` field that will be populated when this integration is activated.

### 2.7 Data Model

**`Product`**

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | |
| `vendorId` | ObjectId | |
| `title` | String | |
| `descriptionMarkdown` | String | |
| `type` | Enum | `physical`, `digital`, `service` |
| `price` | Integer | Minor currency units (e.g. cents). Integer only — no fractional/float values. |
| `currency` | String | ISO 4217, default `USD` |
| `inventoryCount` | Integer? | Non-negative integer stock count. `null`/absent = unlimited stock. Decremented atomically on order. |
| `lowStockThreshold` | Integer? | Optional non-negative integer |
| `status` | Enum | `draft`, `listed`, `published`, `unlisted` |
| `images` | String[] | Cloudflare R2 URLs |
| `tags` | String[] | For search indexing |
| `categoryIds` | ObjectId[] | |
| `platformFeeOverridePct` | Number? | Overrides store/global default |
| `createdAt` | Date | |
| `publishedAt` | Date? | |

**`Order`**

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | |
| `buyerId` | ObjectId | |
| `vendorId` | ObjectId | |
| `items` | Array | `{ productId, quantity, unitPrice, subtotal }` |
| `subtotal` | Number | |
| `platformFeeAmount` | Number | Calculated at time of purchase |
| `total` | Number | |
| `currency` | String | |
| `paymentStatus` | Enum | `pending`, `paid`, `refunded`, `failed` |
| `stripePaymentIntentId` | String? | |
| `fulfillmentStatus` | Enum | `pending`, `processing`, `shipped`, `delivered`, `cancelled` |
| `fulfillmentProvider` | String? | Future: `shipday`, `fleetbase`, `manual` |
| `carrierTrackingRef` | String? | Future: carrier tracking number |
| `shippingAddress` | Object | |
| `createdAt` | Date | |

**`Review`**

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | |
| `productId` | ObjectId | |
| `orderId` | ObjectId | Verified purchase reference |
| `authorId` | ObjectId | |
| `rating` | Number | 1–5 |
| `comment` | String | |
| `aiModerationStatus` | Enum | `clear`, `flagged`, `blocked` |
| `publishedAt` | Date? | Null until AI clears |
| `createdAt` | Date | |

---

## 3. Cross-Feature Constraints

The boundary between Community Boards and the Marketplace is a hard architectural constraint enforced by the AI moderation layer.

| Constraint | Enforcement |
| :--- | :--- |
| Vendors **cannot** use Community Boards to promote products or services. | AI moderation blocks promotional posts and flags them for admin/moderator review. |
| Buyers **cannot** leave reviews unless they have a verified purchase. | Enforced at the API layer — `orderId` is required and validated. |
| Community Board threads **cannot** be created by anonymous users unless the board's anonymous posting flag is explicitly enabled by an admin. | Enforced at the API layer. |
| A product must be **Listed** before it can be **Published**. | Enforced by the product state machine at the API layer. |

---

## 4. Phasing & Delivery Roadmap

| Phase | Feature | Scope |
| :--- | :--- | :--- |
| **Phase 1** | Community Boards — Core | Board creation (admin), thread CRUD, AI deduplication, basic content moderation, in-app notifications |
| **Phase 1** | Marketplace — Core | Product/service CRUD, four-state lifecycle, inventory management, vendor storefront page |
| **Phase 2** | Community Boards — Payments | Paid board subscriptions (member-pays model) |
| **Phase 2** | Marketplace — Payments | Stripe checkout, platform fee engine, order management, verified-purchase reviews |
| **Phase 2** | Community Boards — Notifications | Email digest and push notifications |
| **Phase 3** | Community Boards — Paid Boards (Owner) | Owner/moderator-funded boards, revenue share |
| **Phase 3** | Marketplace — Carrier Integration | ShipDay / Fleetbase "Book My Delivery" integration |
| **Phase 3** | Community Boards — Advanced AI | AI rule learning from moderator overrides, cross-board semantic search |
