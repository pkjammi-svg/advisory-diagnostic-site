"use client";

// Shown instead of a blank error screen if a page fails (e.g. Supabase not configured yet).
export default function Error({ reset }) {
  return (
    <div className="wrap">
      <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
        <span className="eyebrow">Something went wrong</span>
        <h1>We couldn't load this page</h1>
        <p className="sub">Please try again in a moment. If it keeps happening, contact us and we'll sort it out.</p>
        <div className="btn-row">
          <button className="primary" onClick={() => reset()}>Try again</button>
          <a className="button secondary" href="/">Go to homepage</a>
        </div>
      </div>
    </div>
  );
}
