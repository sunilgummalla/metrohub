import React, { useState } from "react";
import { login } from "../api";
import type { MemberSession } from "../api";

interface LoginPageProps {
  onLogin: (session: MemberSession) => void;
  onGoRegister: () => void;
  onGoForgot: () => void;
}

/** Basic email format check — avoids a round-trip for obviously invalid input. */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function LoginPage({ onLogin, onGoRegister, onGoForgot }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    try {
      const session = await login({ email: email.trim(), password });
      onLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
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
        <h1 className="auth-title">Member sign in</h1>
        <p className="auth-sub">Manage your vendor listing on Metro Hub</p>

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
          <label className="auth-label">
            Password
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>

          <button
            className="auth-btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="auth-links">
          <button className="auth-link" type="button" onClick={onGoForgot}>
            Forgot password?
          </button>
          <span className="auth-sep">·</span>
          <button className="auth-link" type="button" onClick={onGoRegister}>
            Register your business
          </button>
        </div>
      </div>
    </div>
  );
}
