"use client";
import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { friendlyAuthError } from "../../lib/authErrors";

export default function SignupPage() {
  const [form, setForm] = useState({ fullName: "", company: "", phone: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    let error;
    try {
      ({ error } = await createSupabaseBrowserClient().auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.fullName, company: form.company, phone: form.phone },
          emailRedirectTo: `${window.location.origin}/login`
        }
      }));
    } catch (err) {
      error = err;
    }
    setLoading(false);
    if (error) {
      setError(friendlyAuthError(error));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="wrap">
        <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
          <span className="badge">Account created</span>
          <h1>Check your email</h1>
          <p className="sub">
            We've sent a confirmation link to <strong>{form.email}</strong>. Confirm it, then{" "}
            <Link className="link" href="/login">sign in</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="card" style={{ maxWidth: 460, margin: "0 auto" }}>
        <span className="eyebrow">Create account</span>
        <h1>Open your client portal</h1>
        <p className="sub">One account for all your requests, documents and solutions.</p>
        <form className="authform" onSubmit={handleSubmit}>
          <label htmlFor="fullName">Full name</label>
          <input id="fullName" required value={form.fullName} onChange={set("fullName")} autoComplete="name" />
          <label htmlFor="company">Company / business name</label>
          <input id="company" value={form.company} onChange={set("company")} autoComplete="organization" />
          <label htmlFor="phone">Phone (optional)</label>
          <input id="phone" type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" />
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={8} value={form.password} onChange={set("password")} autoComplete="new-password" />
          <button className="primary" type="submit" disabled={loading} style={{ marginTop: 18, width: "100%" }}>
            {loading ? "Creating account..." : "Create account"}
          </button>
          {error && <p className="error-text">{error}</p>}
        </form>
        <p className="sub" style={{ marginTop: 16 }}>
          Already have an account? <Link className="link" href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
