"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/history");
    router.refresh();
  }

  return (
    <div className="wrap">
      <div className="card" style={{ maxWidth: 380, margin: "0 auto" }}>
        <span className="eyebrow">Sign in</span>
        <h1>Welcome back</h1>
        <p className="sub">Sign in to view your past diagnostics.</p>
        <form className="authform" onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="primary" type="submit" disabled={loading} style={{ marginTop: 18, width: "100%" }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
          {error && <p className="error-text">{error}</p>}
        </form>
        <p className="sub" style={{ marginTop: 16 }}>
          New here? <Link className="link" href="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
