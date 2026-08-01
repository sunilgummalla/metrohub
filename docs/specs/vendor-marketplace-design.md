# MetroHub Vendor Marketplace — Design Document

## 1. Overview
The MetroHub Vendor Marketplace is a comprehensive local services directory where users can discover, browse, and learn about local vendors (restaurants, retail, freelancers, home services, etc.). It acts as a central hub for vendors, aggregating their profile information, active deals, and upcoming events into a single rich page.

### 1.1 Multi-App Architecture
To prevent UI clutter and separate concerns, the platform is divided into three distinct web applications:
- **`www.metrohub.io` / `seattle.metrohub.io`** — The public-facing user portal. `www` acts as a city-picker landing page, routing users to city-specific subdomains (e.g., `seattle`) where they browse vendor listings.
- **`member.metrohub.io`** — The vendor portal. Approved vendors log in here to manage their profile, markdown descriptions, search tags, deals, events, and active boosters.
- **`admin.metrohub.io`** — The internal admin portal. MetroHub staff use this to review and approve vendor registrations, moderate content, and manage subscription tiers.

---

## 2. Core Features

### 2.1 Rich Vendor Profiles
- **Markdown Descriptions**: Vendors can write their descriptions using Markdown, allowing for rich text formatting (headers, lists, bold/italic) which is rendered natively on the public site.
- **Category-Specific Data**: The schema supports dynamic fields based on the vendor's category (e.g., a restaurant might have a menu link and cuisine type, while a plumber has emergency service hours).
- **Search Tags**: Vendors can define specific search tags to optimize their discoverability.

### 2.2 Integrated Hub
A vendor's public profile is not just static text; it is an active hub.
- **Deals Integration**: Any deals posted by the vendor (via the Deals feature) are displayed on their profile.
- **Events Integration**: Any events hosted by the vendor (via the Near By feature) are displayed on their profile.

### 2.3 AI & Vector Search Readiness
Every time a vendor updates their profile, description, or search tags, the backend tokenizes the text and generates vector embeddings.
- **Vector Database**: These embeddings are stored in a vector database (e.g., MongoDB Atlas Vector Search or a dedicated DB like Qdrant/Pinecone).
- **Chainlit Integration**: The upcoming Chainlit AI assistant will query this vector store to provide highly accurate, semantic answers to user queries (e.g., "Find me a vegan-friendly caterer in Bellevue who does small parties").

---

## 3. Monetization: Subscriptions & Boosters

The marketplace uses a hybrid monetization model designed for future growth. At launch, the system will operate entirely on a "Free" tier, but the underlying data structures will fully support paid tiers and transactional boosters.

### 3.1 Subscription Tiers
Subscriptions define the baseline capabilities of a vendor account.
- **Tier Levels**: e.g., `Free`, `Pro`, `Enterprise`.
- **Feature Flags**: Each tier defines what the vendor can do (e.g., `maxImages: 5`, `canPostDeals: true`).
- **Initial State**: Only the `Free` tier is active at launch.

### 3.2 Boosters
Boosters are orthogonal to subscriptions. They are transactional add-ons that provide temporary visibility boosts (e.g., "Featured Listing", "Promoted Search Result").
- **Independence**: A vendor on the Free tier can purchase a booster.
- **Allowances**: Higher subscription tiers may include a monthly allowance of free boosters.
- **Lifecycle**: Boosters have a defined `count` (e.g., 3 uses) and `period` (e.g., daily, weekly). Once expired, the listing returns to its organic rank.

---

## 4. Data Models (MongoDB)

### 4.1 Vendor Schema
```typescript
{
  _id: ObjectId,
  ownerId: ObjectId, // Link to User account
  status: String, // 'pending', 'approved', 'rejected', 'suspended'
  
  // Basic Info
  businessName: String,
  category: String, // e.g., 'Restaurant', 'Home Service'
  categoryData: Record<string, any>, // Dynamic JSON for category-specific info
  
  // Rich Content
  descriptionMarkdown: String,
  images: [String], // S3 URLs
  searchTags: [String],
  
  // Geo & Contact
  citySlug: String, // e.g., 'seattle'
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  address: String,
  contact: {
    phone: String,
    email: String,
    website: String
  },
  
  // Monetization State
  subscriptionTierId: ObjectId,
  activeBoosters: [{
    type: String, // e.g., 'featured_search'
    expiresAt: Date
  }],
  
  // AI Metadata
  vectorEmbeddingId: String, // Reference to vector store document
  lastTokenizedAt: Date
}
```

### 4.2 Booster Configuration Schema
```typescript
{
  _id: ObjectId,
  name: String, // e.g., "Weekly Featured Placement"
  type: String, // 'featured_category', 'promoted_search'
  durationMs: Number, // How long the booster lasts once activated
  price: Number,
  currency: String
}
```

---

## 5. System Architecture & Workflows

### 5.1 Registration & Approval Flow
1. **Vendor Application**: A user visits `member.metrohub.io`, signs up, and fills out the vendor onboarding form.
2. **Pending State**: The `Vendor` document is created with `status: 'pending'`.
3. **Admin Review**: MetroHub staff log into `admin.metrohub.io`, review the details, and click "Approve".
4. **Vectorization**: Upon approval, an async background job (NestJS worker) parses the markdown and tags, calls the embedding API, and stores the vector data.
5. **Live**: The vendor now appears on `seattle.metrohub.io`.

### 5.2 Multi-City Routing
- Users hit `www.metrohub.io` and select "Seattle".
- They are redirected to `seattle.metrohub.io`.
- The frontend (Next.js/React) extracts the `seattle` subdomain and passes it as a `citySlug` header/parameter to all API calls.
- The NestJS backend filters all MongoDB queries by `citySlug: 'seattle'`.

### 5.3 AI Search Flow (Future)
1. User asks the Chainlit assistant: "Who fixes roofs in Ballard?"
2. Chainlit converts the query to a vector.
3. Chainlit queries the vector database, filtering by `citySlug: 'seattle'`.
4. The database returns the top 3 vendor IDs.
5. Chainlit fetches the rich vendor data from the NestJS API and formats a natural language response with links to the vendor profiles.
