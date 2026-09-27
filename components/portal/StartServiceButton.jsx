"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartServiceButton({ service, label = "Select this service" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function start() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/engagements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push(`/engagement/${data.id}/data`);
  }

  return (
    <>
      <button className="primary" onClick={start} disabled={loading} style={{ width: "100%" }}>
        {loading ? "Starting..." : label}
      </button>
      {error && <p className="error-text">{error}</p>}
    </>
  );
}
