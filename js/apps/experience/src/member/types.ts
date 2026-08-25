export interface Sponsorship {
  eventTypes: string[];
  budgetRange: string;
  audience: string;
  contactEmail: string;
  notes: string;
}

export interface MyListing {
  _id: string;
  businessName: string;
  category: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  openToSponsorships?: boolean;
  sponsorship?: Sponsorship;
}

export type Provider = "google" | "instagram" | "amazon" | "entra-work" | "entra-personal";

export interface Session {
  memberId: string;
  email: string;
  displayName: string;
  provider: string;
  token: string;
}

export interface CreateVendorInput {
  businessName: string;
  category: string;
  citySlug: string;
  descriptionMarkdown?: string;
  address?: string;
  searchTags?: string[];
  contact?: { phone?: string; email?: string; website?: string };
  openToSponsorships?: boolean;
  sponsorship?: Sponsorship;
}
