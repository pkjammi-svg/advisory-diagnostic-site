"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { friendlyAuthError } from "../../lib/authErrors";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/portal";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    let error;
    try {
      ({ error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email, password }));
    } catch (err) {
      error = err;
    }
    setLoading(false);
    if (error) {
      setError(friendlyAuthError(error));
      return;
    }
    router.push(safeNext);
    router.refresh();
  }

  async function forgotPassword() {
    setError("");
    setInfo("");
    if (!email) {
      setError("Enter your email above first.");
      return;
    }
    let error;
    try {
      ({ error } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }));
    } catch (err) {
      error = err;
    }
    if (error) setError(friendlyAuthError(error));
    else setInfo("If that email has an account, a password reset link is on its way.");
  }

  return (
    <div className="auth-shell">
      <div className="auth-intro">
        <span className="eyebrow">Client portal</span>
        <h1>Sign in to share your information securely.</h1>
        <p className="sub">
          Choose the service you need, answer a few structured questions, upload your documents,
          and track your request through to the final solution — all in one place.
        </p>
        <ol className="step-list">
          <li><strong>Choose a service</strong>Evaluation, root cause, performance analysis or risk & controls.</li>
          <li><strong>Share your data</strong>Guided questions plus a document checklist.</li>
          <li><strong>Get confirmation</strong>See exactly what we received and what's still needed.</li>
          <li><strong>Receive your solution</strong>Your analysis and recommendations, delivered here.</li>
        </ol>
      </div>
      <div className="card auth-card">
        <h2 className="card-title">Sign in</h2>
        <form className="authform" onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="primary" type="submit" disabled={loading} style={{ marginTop: 18, width: "100%" }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
          {error && <p className="error-text">{error}</p>}
          {info && <p className="success-text">{info}</p>}
        </form>
        <p className="sub" style={{ marginTop: 14 }}>
          <button type="button" className="link" onClick={forgotPassword}>Forgot password?</button>
        </p>
        <p className="sub" style={{ marginTop: 10 }}>
          New here? <Link className="link" href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="wrap">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
