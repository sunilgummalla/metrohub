import React, { useState } from "react";
import { requestPasswordReset } from "../api";

interface ForgotPasswordPageProps {
  onGoLogin: () => void;
}

/** Basic email format check — avoids a round-trip for obviously invalid input. */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function ForgotPasswordPage({ onGoLogin }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation — noValidate disables browser constraint validation,
    // so we must check required fields and email format ourselves before submitting.
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/favicon-32x32.png" alt="Metro Hub" width={32} height={32} />
          <span>Metro Hub</span>
        </div>
        <h1 className="auth-title">Reset password</h1>

        {sent ? (
          <div className="auth-success">
            <p>If an account exists for <strong>{email}</strong>, you will receive a reset link shortly.</p>
            <button className="auth-btn-primary" type="button" onClick={onGoLogin}>
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <p className="auth-sub">Enter your email and we will send you a reset link.</p>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <label className="auth-label">
                Email
                <input
                  className="auth-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
              <button className="auth-btn-primary" type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <div className="auth-links">
              <button className="auth-link" type="button" onClick={onGoLogin}>
                ← Back to sign in
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
