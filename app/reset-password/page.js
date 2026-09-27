"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { friendlyAuthError } from "../../lib/authErrors";

// Supabase signs the user in from the reset-email link, then they set a new password here.
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    let error;
    try {
      ({ error } = await createSupabaseBrowserClient().auth.updateUser({ password }));
    } catch (err) {
      error = err;
    }
    setLoading(false);
    if (error) setError(friendlyAuthError(error));
    else router.push("/portal");
  }

  return (
    <div className="wrap">
      <div className="card" style={{ maxWidth: 400, margin: "0 auto" }}>
        <h1>Set a new password</h1>
        <form className="authform" onSubmit={handleSubmit}>
          <label htmlFor="password">New password</label>
          <input id="password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="primary" type="submit" disabled={loading} style={{ marginTop: 18, width: "100%" }}>Save password</button>
          {error && <p className="error-text">{error}</p>}
        </form>
      </div>
    </div>
  );
}
