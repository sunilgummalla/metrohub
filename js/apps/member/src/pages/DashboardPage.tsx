import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getMyProfile,
  updateMyProfile,
  uploadImage,
  deleteImage,
} from "../api";
import type { VendorProfile } from "../api";

interface DashboardPageProps {
  businessName: string;
  onLogout: () => void;
}

type Tab = "profile" | "description" | "images" | "tags" | "preview";

const STATUS_LABELS: Record<VendorProfile["status"], string> = {
  pending: "⏳ Pending review",
  approved: "✅ Live",
  rejected: "❌ Rejected",
  suspended: "⚠️ Suspended",
};

const STATUS_COLORS: Record<VendorProfile["status"], string> = {
  pending: "#f59e0b",
  approved: "#22c55e",
  rejected: "#ef4444",
  suspended: "#f97316",
};

export function DashboardPage({ businessName, onLogout }: DashboardPageProps) {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Editable fields
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [categoryData, setCategoryData] = useState<Record<string, string>>({});
  const [newCatKey, setNewCatKey] = useState("");
  const [newCatVal, setNewCatVal] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    getMyProfile()
      .then((p) => {
        setProfile(p);
        setAddress(p.address ?? "");
        setPhone(p.contact.phone ?? "");
        setEmail(p.contact.email ?? "");
        setWebsite(p.contact.website ?? "");
        setDescription(p.descriptionMarkdown ?? "");
        setTags(p.searchTags ?? []);
        const cd: Record<string, string> = {};
        for (const [k, v] of Object.entries(p.categoryData ?? {})) {
          cd[k] = String(v);
        }
        setCategoryData(cd);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  const saveProfile = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMyProfile({
        address: address || undefined,
        contact: {
          phone: phone || undefined,
          email: email || undefined,
          website: website || undefined,
        },
        descriptionMarkdown: description || undefined,
        searchTags: tags,
        categoryData,
      });
      setProfile(updated);
      flash("Profile saved successfully");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [address, phone, email, website, description, tags, categoryData]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setSaving(true);
    setError(null);
    try {
      const { url } = await uploadImage(file);
      setProfile({ ...profile, images: [...profile.images, url] });
      flash("Image uploaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteImage(url: string) {
    if (!profile) return;
    if (!confirm("Remove this image?")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteImage(url);
      setProfile({ ...profile, images: profile.images.filter((u) => u !== url) });
      flash("Image removed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  function addTag() {
    const t = tagsInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagsInput("");
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  function addCategoryField() {
    const k = newCatKey.trim();
    const v = newCatVal.trim();
    if (!k) return;
    setCategoryData({ ...categoryData, [k]: v });
    setNewCatKey("");
    setNewCatVal("");
  }

  function removeCategoryField(k: string) {
    const next = { ...categoryData };
    delete next[k];
    setCategoryData(next);
  }

  if (loading) return <div className="dash-loading">Loading your profile…</div>;

  return (
    <div className="dash-layout">
      {/* ── Sidebar ── */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-brand">
          <img src="/favicon-32x32.png" alt="Metro Hub" width={24} height={24} />
          <span>Metro Hub</span>
        </div>
        <div className="dash-sidebar-biz">{businessName}</div>

        {profile && (
          <div
            className="dash-status-badge"
            style={{ color: STATUS_COLORS[profile.status] }}
          >
            {STATUS_LABELS[profile.status]}
          </div>
        )}

        <nav className="dash-nav">
          {(["profile", "description", "images", "tags", "preview"] as Tab[]).map((t) => (
            <button
              key={t}
              className={`dash-nav-item${activeTab === t ? " dash-nav-item--active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t === "profile" && "📋 Profile"}
              {t === "description" && "📝 Description"}
              {t === "images" && "🖼 Images"}
              {t === "tags" && "🏷 Tags & Data"}
              {t === "preview" && "👁 Preview"}
            </button>
          ))}
        </nav>

        <button className="dash-logout" onClick={onLogout}>Sign out</button>
      </aside>

      {/* ── Main content ── */}
      <main className="dash-main">
        {error && <div className="dash-error" role="alert">{error}</div>}
        {success && <div className="dash-success" role="status">{success}</div>}

        {/* ── Profile tab ── */}
        {activeTab === "profile" && (
          <section className="dash-section">
            <h2 className="dash-section-title">Contact information</h2>
            <p className="dash-section-sub">
              This information is shown on your public listing.
            </p>
            <div className="dash-form">
              <label className="dash-label">
                Address
                <input
                  className="dash-input"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, city, state"
                />
              </label>
              <label className="dash-label">
                Phone
                <input
                  className="dash-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (206) 555-0100"
                />
              </label>
              <label className="dash-label">
                Public email
                <input
                  className="dash-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@yourbusiness.com"
                />
              </label>
              <label className="dash-label">
                Website
                <input
                  className="dash-input"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourbusiness.com"
                />
              </label>
              <button
                className="dash-btn-primary"
                onClick={saveProfile}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </section>
        )}

        {/* ── Description tab ── */}
        {activeTab === "description" && (
          <section className="dash-section">
            <h2 className="dash-section-title">Business description</h2>
            <p className="dash-section-sub">
              Write your description in{" "}
              <a
                href="https://www.markdownguide.org/cheat-sheet/"
                target="_blank"
                rel="noopener noreferrer"
                className="dash-link"
              >
                Markdown
              </a>
              . It will be beautifully rendered on your public page.
            </p>
            <div className="dash-md-editor">
              <div className="dash-md-pane">
                <div className="dash-md-pane-label">Editor</div>
                <textarea
                  className="dash-md-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`## About us\n\nWe are a family-run catering business…\n\n## What we offer\n\n- Custom menus\n- Delivery available\n- Vegetarian options`}
                  spellCheck
                />
              </div>
              <div className="dash-md-pane">
                <div className="dash-md-pane-label">Preview</div>
                <div className="dash-md-preview">
                  {description ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {description}
                    </ReactMarkdown>
                  ) : (
                    <span className="dash-md-empty">Nothing to preview yet…</span>
                  )}
                </div>
              </div>
            </div>
            <button
              className="dash-btn-primary"
              onClick={saveProfile}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save description"}
            </button>
          </section>
        )}

        {/* ── Images tab ── */}
        {activeTab === "images" && (
          <section className="dash-section">
            <h2 className="dash-section-title">Images</h2>
            <p className="dash-section-sub">
              Upload photos of your business, products, or services. The first image is used as the thumbnail on the marketplace.
            </p>
            <div className="dash-images-grid">
              {(profile?.images ?? []).map((url, i) => (
                <div key={url} className="dash-image-item">
                  <img src={url} alt={`Image ${i + 1}`} className="dash-image-thumb" />
                  {i === 0 && <span className="dash-image-primary-badge">Thumbnail</span>}
                  <button
                    className="dash-image-delete"
                    onClick={() => handleDeleteImage(url)}
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <label className="dash-image-upload-btn" aria-label="Upload image">
                <span>+ Add image</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </section>
        )}

        {/* ── Tags & category data tab ── */}
        {activeTab === "tags" && (
          <section className="dash-section">
            <h2 className="dash-section-title">Search tags</h2>
            <p className="dash-section-sub">
              Tags help users and the AI assistant find your listing. Use descriptive terms like "vegan", "same-day delivery", "outdoor seating".
            </p>
            <div className="dash-tags-input-row">
              <input
                className="dash-input dash-tags-input"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Type a tag and press Enter"
              />
              <button className="dash-btn-secondary" onClick={addTag}>Add</button>
            </div>
            <div className="dash-tags-list">
              {tags.map((t) => (
                <span key={t} className="dash-tag">
                  {t}
                  <button
                    className="dash-tag-remove"
                    onClick={() => removeTag(t)}
                    aria-label={`Remove tag ${t}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            <h2 className="dash-section-title" style={{ marginTop: "2rem" }}>Category-specific details</h2>
            <p className="dash-section-sub">
              Add key–value pairs that are specific to your business type, e.g. "Cuisine: Indian", "Parking: Free street parking", "Hours: Mon–Fri 9am–6pm".
            </p>
            <div className="dash-catdata-table">
              {Object.entries(categoryData).map(([k, v]) => (
                <div key={k} className="dash-catdata-row">
                  <input
                    className="dash-input dash-catdata-key"
                    value={k}
                    readOnly
                  />
                  <input
                    className="dash-input dash-catdata-val"
                    value={v}
                    onChange={(e) =>
                      setCategoryData({ ...categoryData, [k]: e.target.value })
                    }
                  />
                  <button
                    className="dash-btn-danger-sm"
                    onClick={() => removeCategoryField(k)}
                    aria-label={`Remove ${k}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="dash-catdata-row">
                <input
                  className="dash-input dash-catdata-key"
                  value={newCatKey}
                  onChange={(e) => setNewCatKey(e.target.value)}
                  placeholder="Field name"
                />
                <input
                  className="dash-input dash-catdata-val"
                  value={newCatVal}
                  onChange={(e) => setNewCatVal(e.target.value)}
                  placeholder="Value"
                />
                <button className="dash-btn-secondary" onClick={addCategoryField}>
                  Add
                </button>
              </div>
            </div>

            <button
              className="dash-btn-primary"
              onClick={saveProfile}
              disabled={saving}
              style={{ marginTop: "1.5rem" }}
            >
              {saving ? "Saving…" : "Save tags & details"}
            </button>
          </section>
        )}

        {/* ── Preview tab ── */}
        {activeTab === "preview" && profile && (
          <section className="dash-section">
            <h2 className="dash-section-title">Public listing preview</h2>
            <p className="dash-section-sub">
              This is how your listing will appear to users on the Vendor Marketplace.
            </p>
            <div className="dash-preview-card">
              {profile.images.length > 0 && (
                <img
                  src={profile.images[0]}
                  alt={profile.businessName}
                  className="dash-preview-img"
                />
              )}
              <div className="dash-preview-body">
                <span className="dash-preview-category">{profile.category}</span>
                <h3 className="dash-preview-name">{profile.businessName}</h3>
                {address && <p className="dash-preview-address">📍 {address}</p>}
                {description && (
                  <div className="dash-preview-md">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {description}
                    </ReactMarkdown>
                  </div>
                )}
                {tags.length > 0 && (
                  <div className="dash-preview-tags">
                    {tags.map((t) => (
                      <span key={t} className="dash-preview-tag">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
