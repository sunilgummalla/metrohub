import React, { useEffect, useState } from "react";
import { register, getCategories } from "../api";
import type { MemberSession } from "../api";

interface RegisterPageProps {
  onRegister: (session: MemberSession) => void;
  onGoLogin: () => void;
}

export function RegisterPage({ onRegister, onGoLogin }: RegisterPageProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [form, setForm] = useState({
    businessName: "",
    category: "",
    customCategory: "",
    citySlug: "seattle",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    website: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories(form.citySlug).then(setCategories).catch(() => setCategories([]));
  }, [form.citySlug]);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const category = form.category === "__custom__" ? form.customCategory.trim() : form.category;
    if (!category) {
      setError("Please select or enter a category");
      return;
    }

    setLoading(true);
    try {
      const session = await register({
        businessName: form.businessName,
        category,
        citySlug: form.citySlug,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        website: form.website || undefined,
        address: form.address || undefined,
      });
      onRegister(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <div className="auth-logo">
          <img src="/favicon-32x32.png" alt="Metro Hub" width={32} height={32} />
          <span>Metro Hub</span>
        </div>
        <h1 className="auth-title">Register your business</h1>
        <p className="auth-sub">
          Join the Metro Hub Vendor Marketplace. Your listing will be reviewed before going live.
        </p>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-section-title">Business details</div>

          <label className="auth-label">
            Business name <span className="auth-required">*</span>
            <input
              className="auth-input"
              type="text"
              value={form.businessName}
              onChange={set("businessName")}
              required
              placeholder="e.g. Seattle Catering Co."
            />
          </label>

          <label className="auth-label">
            Category <span className="auth-required">*</span>
            <select
              className="auth-input"
              value={form.category}
              onChange={set("category")}
              required
            >
              <option value="">— Select a category —</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="__custom__">Other (specify below)</option>
            </select>
          </label>

          {form.category === "__custom__" && (
            <label className="auth-label">
              Custom category <span className="auth-required">*</span>
              <input
                className="auth-input"
                type="text"
                value={form.customCategory}
                onChange={set("customCategory")}
                required
                placeholder="e.g. Day Care, Pet Grooming…"
              />
            </label>
          )}

          <label className="auth-label">
            Address
            <input
              className="auth-input"
              type="text"
              value={form.address}
              onChange={set("address")}
              placeholder="Street address, city, state"
            />
          </label>

          <label className="auth-label">
            Phone
            <input
              className="auth-input"
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              placeholder="+1 (206) 555-0100"
            />
          </label>

          <label className="auth-label">
            Website
            <input
              className="auth-input"
              type="url"
              value={form.website}
              onChange={set("website")}
              placeholder="https://yourbusiness.com"
            />
          </label>

          <div className="auth-section-title">Account credentials</div>

          <label className="auth-label">
            Email <span className="auth-required">*</span>
            <input
              className="auth-input"
              type="email"
              value={form.email}
              onChange={set("email")}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>

          <label className="auth-label">
            Password <span className="auth-required">*</span>
            <input
              className="auth-input"
              type="password"
              value={form.password}
              onChange={set("password")}
              required
              autoComplete="new-password"
              placeholder="At least 8 characters"
              minLength={8}
            />
          </label>

          <label className="auth-label">
            Confirm password <span className="auth-required">*</span>
            <input
              className="auth-input"
              type="password"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              required
              autoComplete="new-password"
              placeholder="Repeat password"
            />
          </label>

          <button
            className="auth-btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? "Submitting…" : "Submit for review"}
          </button>
        </form>

        <div className="auth-links">
          <span>Already registered?</span>
          <button className="auth-link" type="button" onClick={onGoLogin}>
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
