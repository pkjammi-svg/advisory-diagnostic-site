import Link from "next/link";
import { redirect } from "next/navigation";
import { SERVICES, STATUSES, assess } from "../../lib/services";
import { db, getCurrentUser } from "../../lib/auth";
import { formatDate } from "../../lib/format";

function nextAction(eng, a) {
  switch (eng.status) {
    case "draft": return { href: `/engagement/${eng.id}/data`, label: "Continue filling in" };
    case "needs_info": return { href: `/engagement/${eng.id}/data`, label: "Provide requested information" };
    case "solution_ready": return { href: `/engagement/${eng.id}/solution`, label: "View solution" };
    default: return { href: `/engagement/${eng.id}/confirmation`, label: a.complete ? "View confirmation" : "See what's still needed" };
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: engagements } = await db()
    .from("engagements")
    .select("id, service, status, company_name, inputs, requests, submitted_at, solution_published_at, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const ids = (engagements || []).map((e) => e.id);
  const { data: files } = ids.length
    ? await db().from("engagement_files").select("engagement_id, doc_type").in("engagement_id", ids)
    : { data: [] };

  const rows = (engagements || []).map((e) => {
    const a = assess(e.service, e.inputs, (files || []).filter((f) => f.engagement_id === e.id), e.requests);
    return { e, a, action: nextAction(e, a) };
  });

  const count = (fn) => rows.filter(fn).length;
  const needsYou = count(({ e }) => e.status === "draft" || e.status === "needs_info");
  const name = user.user_metadata?.full_name;

  return (
    <div className="wrap">
      <div className="dash-head">
        <div>
          <span className="eyebrow">My dashboard</span>
          <h1 className="page-title">{name ? `${name}'s requests` : "My requests"}</h1>
          <p className="sub">Track every request, see what we still need, and open your solutions.</p>
        </div>
        <Link href="/services" className="button primary">+ New request</Link>
      </div>

      <div className="stat-row">
        <div className="kpi"><span className="kpi-label">Total requests</span><span className="kpi-value">{rows.length}</span></div>
        <div className="kpi"><span className="kpi-label">Waiting on you</span><span className={`kpi-value ${needsYou ? "warn-text" : ""}`}>{needsYou}</span></div>
        <div className="kpi"><span className="kpi-label">In analysis</span><span className="kpi-value">{count(({ e }) => e.status === "submitted" || e.status === "in_review")}</span></div>
        <div className="kpi"><span className="kpi-label">Solutions ready</span><span className="kpi-value good-text">{count(({ e }) => e.status === "solution_ready")}</span></div>
      </div>

      {rows.length === 0 ? (
        <div className="card empty">
          <h2 className="card-title">No requests yet</h2>
          <p className="sub">Choose a service to get started — it only takes a few minutes.</p>
          <Link href="/services" className="button primary" style={{ marginTop: 12 }}>Choose a service</Link>
        </div>
      ) : (
        <div className="req-list">
          {rows.map(({ e, a, action }) => (
            <div key={e.id} className={`req-card ${e.status === "needs_info" ? "attention" : ""}`}>
              <div className="req-main">
                <span className="tag">{SERVICES[e.service].short}</span>
                <h2>{e.company_name || SERVICES[e.service].label}</h2>
                <p className="help">
                  Ref #{e.id.slice(0, 8).toUpperCase()} · {e.submitted_at ? `Submitted ${formatDate(e.submitted_at)}` : `Started ${formatDate(e.created_at)}`} · Updated {formatDate(e.updated_at)}
                </p>
              </div>
              <div className="req-progress">
                <span className={`status-pill tone-${STATUSES[e.status].tone}`}>{STATUSES[e.status].label}</span>
                <div className="progress-bar small" aria-label={`${a.percent}% complete`}><span style={{ width: `${a.percent}%` }} /></div>
                <span className="help">{a.percent}% of required information</span>
              </div>
              <Link href={action.href} className={`button ${e.status === "solution_ready" || e.status === "needs_info" || e.status === "draft" ? "primary" : "secondary"}`}>
                {action.label}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
