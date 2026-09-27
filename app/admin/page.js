import { notFound, redirect } from "next/navigation";
import { SERVICES, STATUSES, assess } from "../../lib/services";
import { db, getCurrentUser, setupMessage } from "../../lib/auth";
import BarList from "../../components/admin/BarList";
import EngagementTable from "../../components/admin/EngagementTable";

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.isAdmin) notFound();

  const { data: engagements, error: loadError } = await db()
    .from("engagements")
    .select("id, user_id, service, status, company_name, client_name, client_email, inputs, requests, submitted_at, updated_at, created_at")
    .order("updated_at", { ascending: false });
  const { data: files } = await db().from("engagement_files").select("engagement_id, doc_type");

  const rows = (engagements || []).map((e) => {
    const a = assess(e.service, e.inputs, (files || []).filter((f) => f.engagement_id === e.id), e.requests);
    const waitingOn =
      e.status === "draft" || e.status === "needs_info" ? "Client"
      : e.status === "solution_ready" ? "—"
      : "You";
    return { ...e, percent: a.percent, fileCount: a.fileCount, waitingOn };
  });

  const clients = new Set(rows.map((r) => r.user_id)).size;
  const waitingOnYou = rows.filter((r) => r.waitingOn === "You").length;
  const total = rows.length;
  const byStatus = Object.entries(STATUSES).map(([k, v]) => ({ label: v.label, value: rows.filter((r) => r.status === k).length }));
  const byService = Object.values(SERVICES).map((s) => ({ label: s.short, value: rows.filter((r) => r.service === s.key).length }));

  return (
    <div className="wrap">
      <span className="eyebrow">Consultant dashboard</span>
      <h1 className="page-title">All clients</h1>
      <p className="sub" style={{ marginBottom: 22 }}>Every request across every client. Open one to review data, request more information, run analysis and publish the solution.</p>

      {loadError && <div className="notice warn-notice">{setupMessage(loadError)}</div>}

      <div className="stat-row">
        <div className="kpi"><span className="kpi-label">Clients</span><span className="kpi-value">{clients}</span></div>
        <div className="kpi"><span className="kpi-label">Requests</span><span className="kpi-value">{total}</span></div>
        <div className="kpi"><span className="kpi-label">Waiting on you</span><span className={`kpi-value ${waitingOnYou ? "warn-text" : ""}`}>{waitingOnYou}</span></div>
        <div className="kpi"><span className="kpi-label">Solutions delivered</span><span className="kpi-value good-text">{rows.filter((r) => r.status === "solution_ready").length}</span></div>
      </div>

      <div className="two-col">
        <section className="card">
          <h2 className="card-title">Requests by status</h2>
          <BarList items={byStatus} total={total} />
        </section>
        <section className="card">
          <h2 className="card-title">Requests by service</h2>
          <BarList items={byService} total={total} />
        </section>
      </div>

      <EngagementTable rows={rows} />
    </div>
  );
}
