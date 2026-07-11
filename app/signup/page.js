"use client";
import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="wrap">
        <div className="card" style={{ maxWidth: 380, margin: "0 auto" }}>
          <span className="badge">Account created</span>
          <h1>Check your email</h1>
          <p className="sub">
            We've sent a confirmation link to <strong>{email}</strong>. Confirm it, then{" "}
            <Link className="link" href="/login">sign in</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="card" style={{ maxWidth: 380, margin: "0 auto" }}>
        <span className="eyebrow">Create account</span>
        <h1>Save your diagnostics</h1>
        <p className="sub">Create an account so you can come back and view your one-pager anytime.</p>
        <form className="authform" onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="primary" type="submit" disabled={loading} style={{ marginTop: 18, width: "100%" }}>
            {loading ? "Creating account..." : "Sign up"}
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
