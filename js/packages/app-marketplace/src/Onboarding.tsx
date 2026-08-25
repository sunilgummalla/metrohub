import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ApiError, createVendor, getToken, listMyVendors, providerSignIn, signOut } from "./api";
import type { CreateVendorInput, MyListing, Provider, Session } from "./types";

const PROVIDERS: Array<{ id: Provider; label: string; glyph: string }> = [
  { id: "google", label: "Google", glyph: "G" },
  { id: "instagram", label: "Instagram", glyph: "◎" },
  { id: "amazon", label: "Amazon", glyph: "a" },
  { id: "entra-work", label: "Microsoft — Work", glyph: "⊞" },
  { id: "entra-personal", label: "Microsoft — Personal", glyph: "⊞" },
];

const SUGGESTED_EVENT_TYPES = [
  "Cultural festival", "Game night", "Kids event", "Fundraiser",
  "Community potluck", "Sports league", "Music & arts", "School event",
];

const STATUS_LABEL: Record<MyListing["status"], string> = {
  pending: "Pending review", approved: "Approved", rejected: "Not approved", suspended: "Suspended",
};

interface FormState {
  businessName: string;
  category: string;
  descriptionMarkdown: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  tags: string;
  openToSponsorships: boolean;
  eventTypes: string[];
  budgetRange: string;
  audience: string;
  sponsorContact: string;
  sponsorNotes: string;
}

const EMPTY_FORM: FormState = {
  businessName: "", category: "", descriptionMarkdown: "", address: "",
  email: "", phone: "", website: "", tags: "",
  openToSponsorships: false, eventTypes: [], budgetRange: "", audience: "", sponsorContact: "", sponsorNotes: "",
};

export function Onboarding({
  citySlug,
  categories,
  onBack,
}: {
  citySlug: string;
  categories: string[];
  onBack: () => void;
}) {
  const [signedIn, setSignedIn] = useState<boolean>(() => !!getToken());
  const [who, setWho] = useState<Session | null>(null);
  const [listings, setListings] = useState<MyListing[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [busyProvider, setBusyProvider] = useState<Provider | null>(null);
  const [authError, setAuthError] = useState("");

  const loadListings = useCallback(async () => {
    setLoadingList(true);
    try {
      setListings(await listMyVendors());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setSignedIn(false);
        setWho(null);
      }
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (signedIn) void loadListings();
  }, [signedIn, loadListings]);

  const handleSignIn = async (provider: Provider) => {
    setBusyProvider(provider);
    setAuthError("");
    try {
      const session = await providerSignIn(provider);
      setWho(session);
      setSignedIn(true);
    } catch (err) {
      setAuthError(err instanceof ApiError ? err.message : "Sign-in failed. Please try again.");
    } finally {
      setBusyProvider(null);
    }
  };

  const handleSignOut = () => {
    signOut();
    setSignedIn(false);
    setWho(null);
    setListings([]);
  };

  return (
    <div className="mktOnb">
      <button type="button" className="mktBackLink" onClick={onBack}>← Back to marketplace</button>
      <header className="mktOnbHead">
        <h2 className="mktOnbTitle">List your business</h2>
        <p className="mktOnbLede">
          Join the MetroHub Marketplace — reach thousands of active local neighbors, and let
          community organizers find you when you're open to sponsoring events.
        </p>
      </header>

      {!signedIn ? (
        <section className="mktOnbCard mktSignin">
          <h3 className="mktOnbSub">Sign in to get started</h3>
          <p className="mktMuted">Use your business account — we never post on your behalf.</p>
          <div className="mktProviders">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`mktProviderBtn mktProvider-${p.id}`}
                onClick={() => handleSignIn(p.id)}
                disabled={busyProvider !== null}
              >
                <span className="mktProviderGlyph" aria-hidden="true">{p.glyph}</span>
                {busyProvider === p.id ? "Signing in…" : `Continue with ${p.label}`}
              </button>
            ))}
          </div>
          {authError && <p className="mktFormError">{authError}</p>}
          <p className="mktFinePrint">
            Social sign-in is being finalized — for now this uses a demo session so you can try the flow.
          </p>
        </section>
      ) : (
        <>
          <div className="mktOnbAccountRow">
            <span className="mktMuted">
              Signed in{who?.displayName ? ` as ${who.displayName}` : ""}
              {who?.provider ? ` · ${who.provider}` : ""}
            </span>
            <button type="button" className="mktTextBtn" onClick={handleSignOut}>Sign out</button>
          </div>

          <MyListings listings={listings} loading={loadingList} />

          <ListingForm
            citySlug={citySlug}
            categories={categories}
            onCreated={(v) => setListings((prev) => [v, ...prev])}
            onAuthLost={handleSignOut}
          />
        </>
      )}
    </div>
  );
}

function MyListings({ listings, loading }: { listings: MyListing[]; loading: boolean }) {
  return (
    <section className="mktOnbCard">
      <h3 className="mktOnbSub">Your listings ({listings.length})</h3>
      {loading ? (
        <p className="mktMuted">Loading…</p>
      ) : listings.length === 0 ? (
        <p className="mktMuted">No listings yet — add your first business below.</p>
      ) : (
        <ul className="mktListingList">
          {listings.map((v) => (
            <li key={v._id} className="mktListingRow">
              <div className="mktListingMain">
                <strong>{v.businessName}</strong>
                <span className="mktListingCat">{v.category}</span>
              </div>
              <div className="mktListingTags">
                {v.openToSponsorships && <span className="mktBadge mktBadgeSponsor">Open to sponsorships</span>}
                <span className={`mktStatusPill mktStatus-${v.status}`}>{STATUS_LABEL[v.status]}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ListingForm({
  citySlug,
  categories,
  onCreated,
  onAuthLost,
}: {
  citySlug: string;
  categories: string[];
  onCreated: (v: MyListing) => void;
  onAuthLost: () => void;
}) {
  const [f, setF] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((prev) => ({ ...prev, [k]: v }));

  const toggleEventType = (t: string) =>
    setF((prev) => ({
      ...prev,
      eventTypes: prev.eventTypes.includes(t) ? prev.eventTypes.filter((x) => x !== t) : [...prev.eventTypes, t],
    }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.businessName.trim() || !f.category.trim()) {
      setError("Business name and category are required.");
      return;
    }
    setBusy(true);
    setError("");
    const input: CreateVendorInput = {
      businessName: f.businessName.trim(),
      category: f.category.trim(),
      citySlug,
      descriptionMarkdown: f.descriptionMarkdown.trim(),
      address: f.address.trim(),
      searchTags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
      contact: { email: f.email.trim(), phone: f.phone.trim(), website: f.website.trim() },
      openToSponsorships: f.openToSponsorships,
      sponsorship: f.openToSponsorships
        ? {
            eventTypes: f.eventTypes,
            budgetRange: f.budgetRange.trim(),
            audience: f.audience.trim(),
            contactEmail: f.sponsorContact.trim(),
            notes: f.sponsorNotes.trim(),
          }
        : { eventTypes: [], budgetRange: "", audience: "", contactEmail: "", notes: "" },
    };
    try {
      const created = await createVendor(input);
      onCreated(created);
      setF(EMPTY_FORM);
      setDone(true);
      window.setTimeout(() => setDone(false), 3000);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthLost();
        return;
      }
      setError(err instanceof ApiError ? err.message : "Could not submit your listing. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="mktOnbCard mktForm" onSubmit={submit}>
      <h3 className="mktOnbSub">Add a business</h3>
      <div className="mktFormGrid">
        <label className="mktField">
          <span className="mktLabel">Business name *</span>
          <input className="mktInput" value={f.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="Mayuri Foods" required />
        </label>
        <label className="mktField">
          <span className="mktLabel">Category *</span>
          <input className="mktInput" list="mkt-categories" value={f.category} onChange={(e) => set("category", e.target.value)} placeholder="restaurant" required />
          <datalist id="mkt-categories">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
      </div>
      <label className="mktField">
        <span className="mktLabel">Description</span>
        <textarea className="mktInput mktTextarea" value={f.descriptionMarkdown} onChange={(e) => set("descriptionMarkdown", e.target.value)} rows={3} placeholder="What you offer, hours, specialties…" />
      </label>
      <label className="mktField">
        <span className="mktLabel">Address</span>
        <input className="mktInput" value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="2245 148th Ave NE, Redmond" />
      </label>
      <div className="mktFormGrid">
        <label className="mktField">
          <span className="mktLabel">Contact email</span>
          <input className="mktInput" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="hello@business.com" />
        </label>
        <label className="mktField">
          <span className="mktLabel">Phone</span>
          <input className="mktInput" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 425-555-0100" />
        </label>
      </div>
      <div className="mktFormGrid">
        <label className="mktField">
          <span className="mktLabel">Website</span>
          <input className="mktInput" value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" />
        </label>
        <label className="mktField">
          <span className="mktLabel">Tags (comma-separated)</span>
          <input className="mktInput" value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="indian, grocery, catering" />
        </label>
      </div>

      {/* ── Sponsorships ── */}
      <div className="mktSponsorBlock">
        <label className="mktToggleRow">
          <input type="checkbox" checked={f.openToSponsorships} onChange={(e) => set("openToSponsorships", e.target.checked)} />
          <span>
            <strong>Open to sponsoring community events</strong>
            <span className="mktMuted"> — let organizers find and pitch you.</span>
          </span>
        </label>

        {f.openToSponsorships && (
          <div className="mktSponsorFields">
            <div className="mktField">
              <span className="mktLabel">What would you sponsor?</span>
              <div className="mktChips">
                {SUGGESTED_EVENT_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`mktChip${f.eventTypes.includes(t) ? " isActive" : ""}`}
                    aria-pressed={f.eventTypes.includes(t)}
                    onClick={() => toggleEventType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="mktFormGrid">
              <label className="mktField">
                <span className="mktLabel">Budget range</span>
                <input className="mktInput" value={f.budgetRange} onChange={(e) => set("budgetRange", e.target.value)} placeholder="$500–$2,000 or in-kind" />
              </label>
              <label className="mktField">
                <span className="mktLabel">Audience you want to reach</span>
                <input className="mktInput" value={f.audience} onChange={(e) => set("audience", e.target.value)} placeholder="Families in Bellevue/Redmond" />
              </label>
            </div>
            <label className="mktField">
              <span className="mktLabel">Sponsorship contact email</span>
              <input className="mktInput" type="email" value={f.sponsorContact} onChange={(e) => set("sponsorContact", e.target.value)} placeholder="sponsor@business.com" />
            </label>
            <label className="mktField">
              <span className="mktLabel">Notes for organizers</span>
              <textarea className="mktInput mktTextarea" value={f.sponsorNotes} onChange={(e) => set("sponsorNotes", e.target.value)} rows={2} placeholder="What you can offer, restrictions, lead time…" />
            </label>
          </div>
        )}
      </div>

      {error && <p className="mktFormError">{error}</p>}
      <div className="mktFormActions">
        <button className="mktSubmitBtn" type="submit" disabled={busy}>
          {busy ? "Submitting…" : done ? "Submitted ✓" : "Submit listing"}
        </button>
        <span className="mktMuted">New listings are reviewed before going live.</span>
      </div>
    </form>
  );
}
