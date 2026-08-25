"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  ApiError, consumeOAuthRedirect, createVendor, getAuthProviders, getToken,
  listMyVendors, providerSignIn, signOut, startOAuth,
} from "./api";
import type { CreateVendorInput, MyListing, Provider, Session } from "./types";
import "./member.css";

const GLYPHS: Record<Provider, string> = {
  google: "G", instagram: "◎", amazon: "a", "entra-work": "⊞", "entra-personal": "⊞",
};
const STUB_PROVIDERS: Array<{ id: Provider; label: string }> = [
  { id: "google", label: "Google" },
  { id: "instagram", label: "Instagram" },
  { id: "amazon", label: "Amazon" },
  { id: "entra-work", label: "Microsoft — Work" },
  { id: "entra-personal", label: "Microsoft — Personal" },
];
const RETURN_PATH = "/";
const CITY_SLUG = "seattle";

const SUGGESTED_EVENT_TYPES = [
  "Cultural festival", "Game night", "Kids event", "Fundraiser",
  "Community potluck", "Sports league", "Music & arts", "School event",
];
const STATUS_LABEL: Record<MyListing["status"], string> = {
  pending: "Pending review", approved: "Approved", rejected: "Not approved", suspended: "Suspended",
};

export function MemberPortal() {
  const [signedIn, setSignedIn] = useState<boolean>(false);
  const [who, setWho] = useState<Session | null>(null);
  const [listings, setListings] = useState<MyListing[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [busyProvider, setBusyProvider] = useState<Provider | null>(null);
  const [authError, setAuthError] = useState("");
  const [auth, setAuth] = useState<{ providers: Array<{ id: Provider; label: string }>; stub: boolean }>({ providers: [], stub: false });

  // Client-only: read the stored token and any OAuth redirect result on mount.
  useEffect(() => {
    const r = consumeOAuthRedirect();
    if (r?.status === "ok") setSignedIn(true);
    else if (r?.status === "error") {
      setAuthError(r.code === "no_email"
        ? "Your provider didn't share an email address — try a different one."
        : "Sign-in didn't complete. Please try again.");
    } else if (getToken()) {
      setSignedIn(true);
    }
    getAuthProviders().then(setAuth).catch(() => { /* leave empty */ });
  }, []);

  const loadListings = useCallback(async () => {
    setLoadingList(true);
    try {
      setListings(await listMyVendors());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { setSignedIn(false); setWho(null); }
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (signedIn) void loadListings();
  }, [signedIn, loadListings]);

  const handleStubSignIn = async (provider: Provider) => {
    setBusyProvider(provider);
    setAuthError("");
    try {
      setWho(await providerSignIn(provider));
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
    <div className="mpApp">
      <header className="mpTopbar">
        <div className="mpBrand"><span className="mpMark" aria-hidden="true">M</span> MetroHub <span className="mpBrandTag">for business</span></div>
        {signedIn && <button type="button" className="mpTextBtn" onClick={handleSignOut}>Sign out</button>}
      </header>

      <main className="mpMain">
        <div className="mpHead">
          <h1 className="mpTitle">List your business</h1>
          <p className="mpLede">
            Join the MetroHub Marketplace — reach thousands of active local neighbors, and let
            community organizers find you when you&apos;re open to sponsoring events.
          </p>
        </div>

        {!signedIn ? (
          <section className="mpCard">
            <h2 className="mpSub">Sign in to get started</h2>
            <p className="mpMuted">Use your business account — we never post on your behalf.</p>
            {auth.providers.length > 0 ? (
              <div className="mpProviders">
                {auth.providers.map((p) => (
                  <button key={p.id} type="button" className={`mpProviderBtn mpProvider-${p.id}`} onClick={() => startOAuth(p.id, RETURN_PATH)}>
                    <span className="mpProviderGlyph" aria-hidden="true">{GLYPHS[p.id]}</span>
                    Continue with {p.label}
                  </button>
                ))}
              </div>
            ) : auth.stub ? (
              <>
                <div className="mpProviders">
                  {STUB_PROVIDERS.map((p) => (
                    <button key={p.id} type="button" className={`mpProviderBtn mpProvider-${p.id}`} onClick={() => handleStubSignIn(p.id)} disabled={busyProvider !== null}>
                      <span className="mpProviderGlyph" aria-hidden="true">{GLYPHS[p.id]}</span>
                      {busyProvider === p.id ? "Signing in…" : `Continue with ${p.label}`}
                    </button>
                  ))}
                </div>
                <p className="mpFinePrint">No OAuth provider is configured, so this uses a local demo session so you can try the flow.</p>
              </>
            ) : (
              <p className="mpFinePrint">Sign-in is being set up — please check back soon.</p>
            )}
            {authError && <p className="mpError">{authError}</p>}
          </section>
        ) : (
          <>
            {who && <p className="mpMuted mpAccount">Signed in as {who.displayName} · {who.provider}</p>}
            <MyListings listings={listings} loading={loadingList} />
            <ListingForm onCreated={(v) => setListings((prev) => [v, ...prev])} onAuthLost={handleSignOut} />
          </>
        )}
      </main>
    </div>
  );
}

function MyListings({ listings, loading }: { listings: MyListing[]; loading: boolean }) {
  return (
    <section className="mpCard">
      <h2 className="mpSub">Your listings ({listings.length})</h2>
      {loading ? (
        <p className="mpMuted">Loading…</p>
      ) : listings.length === 0 ? (
        <p className="mpMuted">No listings yet — add your first business below.</p>
      ) : (
        <ul className="mpList">
          {listings.map((v) => (
            <li key={v._id} className="mpRow">
              <div className="mpRowMain"><strong>{v.businessName}</strong><span className="mpRowCat">{v.category}</span></div>
              <div className="mpRowTags">
                {v.openToSponsorships && <span className="mpBadge mpBadgeSponsor">Open to sponsorships</span>}
                <span className={`mpStatus mpStatus-${v.status}`}>{STATUS_LABEL[v.status]}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface FormState {
  businessName: string; category: string; descriptionMarkdown: string; address: string;
  email: string; phone: string; website: string; tags: string;
  openToSponsorships: boolean; eventTypes: string[]; budgetRange: string; audience: string; sponsorContact: string; sponsorNotes: string;
}
const EMPTY_FORM: FormState = {
  businessName: "", category: "", descriptionMarkdown: "", address: "",
  email: "", phone: "", website: "", tags: "",
  openToSponsorships: false, eventTypes: [], budgetRange: "", audience: "", sponsorContact: "", sponsorNotes: "",
};

function ListingForm({ onCreated, onAuthLost }: { onCreated: (v: MyListing) => void; onAuthLost: () => void }) {
  const [f, setF] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const toggleEventType = (t: string) =>
    setF((prev) => ({ ...prev, eventTypes: prev.eventTypes.includes(t) ? prev.eventTypes.filter((x) => x !== t) : [...prev.eventTypes, t] }));

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
      citySlug: CITY_SLUG,
      descriptionMarkdown: f.descriptionMarkdown.trim(),
      address: f.address.trim(),
      searchTags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
      contact: { email: f.email.trim(), phone: f.phone.trim(), website: f.website.trim() },
      openToSponsorships: f.openToSponsorships,
      sponsorship: f.openToSponsorships
        ? { eventTypes: f.eventTypes, budgetRange: f.budgetRange.trim(), audience: f.audience.trim(), contactEmail: f.sponsorContact.trim(), notes: f.sponsorNotes.trim() }
        : { eventTypes: [], budgetRange: "", audience: "", contactEmail: "", notes: "" },
    };
    try {
      onCreated(await createVendor(input));
      setF(EMPTY_FORM);
      setDone(true);
      window.setTimeout(() => setDone(false), 3000);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { onAuthLost(); return; }
      setError(err instanceof ApiError ? err.message : "Could not submit your listing. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="mpCard mpForm" onSubmit={submit}>
      <h2 className="mpSub">Add a business</h2>
      <div className="mpGrid">
        <label className="mpField">
          <span className="mpLabel">Business name *</span>
          <input className="mpInput" value={f.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="Mayuri Foods" required />
        </label>
        <label className="mpField">
          <span className="mpLabel">Category *</span>
          <input className="mpInput" value={f.category} onChange={(e) => set("category", e.target.value)} placeholder="restaurant" required />
        </label>
      </div>
      <label className="mpField">
        <span className="mpLabel">Description</span>
        <textarea className="mpInput mpTextarea" value={f.descriptionMarkdown} onChange={(e) => set("descriptionMarkdown", e.target.value)} rows={3} placeholder="What you offer, hours, specialties…" />
      </label>
      <label className="mpField">
        <span className="mpLabel">Address</span>
        <input className="mpInput" value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="2245 148th Ave NE, Redmond" />
      </label>
      <div className="mpGrid">
        <label className="mpField">
          <span className="mpLabel">Contact email</span>
          <input className="mpInput" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="hello@business.com" />
        </label>
        <label className="mpField">
          <span className="mpLabel">Phone</span>
          <input className="mpInput" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 425-555-0100" />
        </label>
      </div>
      <div className="mpGrid">
        <label className="mpField">
          <span className="mpLabel">Website</span>
          <input className="mpInput" value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" />
        </label>
        <label className="mpField">
          <span className="mpLabel">Tags (comma-separated)</span>
          <input className="mpInput" value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="indian, grocery, catering" />
        </label>
      </div>

      <div className="mpSponsor">
        <label className="mpToggle">
          <input type="checkbox" checked={f.openToSponsorships} onChange={(e) => set("openToSponsorships", e.target.checked)} />
          <span><strong>Open to sponsoring community events</strong><span className="mpMuted"> — let organizers find and pitch you.</span></span>
        </label>
        {f.openToSponsorships && (
          <div className="mpSponsorFields">
            <div className="mpField">
              <span className="mpLabel">What would you sponsor?</span>
              <div className="mpChips">
                {SUGGESTED_EVENT_TYPES.map((t) => (
                  <button key={t} type="button" className={`mpChip${f.eventTypes.includes(t) ? " isActive" : ""}`} aria-pressed={f.eventTypes.includes(t)} onClick={() => toggleEventType(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div className="mpGrid">
              <label className="mpField">
                <span className="mpLabel">Budget range</span>
                <input className="mpInput" value={f.budgetRange} onChange={(e) => set("budgetRange", e.target.value)} placeholder="$500–$2,000 or in-kind" />
              </label>
              <label className="mpField">
                <span className="mpLabel">Audience you want to reach</span>
                <input className="mpInput" value={f.audience} onChange={(e) => set("audience", e.target.value)} placeholder="Families in Bellevue/Redmond" />
              </label>
            </div>
            <label className="mpField">
              <span className="mpLabel">Sponsorship contact email</span>
              <input className="mpInput" type="email" value={f.sponsorContact} onChange={(e) => set("sponsorContact", e.target.value)} placeholder="sponsor@business.com" />
            </label>
            <label className="mpField">
              <span className="mpLabel">Notes for organizers</span>
              <textarea className="mpInput mpTextarea" value={f.sponsorNotes} onChange={(e) => set("sponsorNotes", e.target.value)} rows={2} placeholder="What you can offer, restrictions, lead time…" />
            </label>
          </div>
        )}
      </div>

      {error && <p className="mpError">{error}</p>}
      <div className="mpActions">
        <button className="mpSubmit" type="submit" disabled={busy}>{busy ? "Submitting…" : done ? "Submitted ✓" : "Submit listing"}</button>
        <span className="mpMuted">New listings are reviewed before going live.</span>
      </div>
    </form>
  );
}
