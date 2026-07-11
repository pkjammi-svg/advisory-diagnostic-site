import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { CATEGORIES } from "../../lib/categories";

export default async function HistoryPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: diagnostics } = await supabase
    .from("diagnostics")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="wrap">
      <span className="eyebrow">Your account</span>
      <h1>My diagnostics</h1>
      <p className="sub" style={{ marginBottom: 24 }}>Every diagnostic conversation you've completed, saved here.</p>

      {(!diagnostics || diagnostics.length === 0) && (
        <div className="card">
          <p className="sub">Nothing here yet. Run a diagnostic from the homepage and it'll be saved to your account.</p>
        </div>
      )}

      {diagnostics && diagnostics.map((d) => (
        <div className="hist-item" key={d.id}>
          <span className="date">{new Date(d.created_at).toLocaleDateString()}</span>
          <span className="tag">{CATEGORIES[d.category]?.label || d.category}</span>
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontSize: 13.5, color: "var(--indigo)" }}>View one-pager</summary>
            <div className="onepager" style={{ marginTop: 10 }} dangerouslySetInnerHTML={{ __html: mdToHtml(d.onepager) }} />
          </details>
        </div>
      ))}
    </div>
  );
}

function mdToHtml(md) {
  if (!md) return "";
  return md
    .split("\n")
    .map((line) => {
      if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
      if (line.trim() === "") return "";
      return `<p>${line}</p>`;
    })
    .join("");
}
