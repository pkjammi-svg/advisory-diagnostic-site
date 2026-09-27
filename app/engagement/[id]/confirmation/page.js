import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SERVICES, STATUSES, assess, formatValue, isEmpty } from "../../../../lib/services";
import { getCurrentUser, loadEngagementFor, loadFiles } from "../../../../lib/auth";
import { formatBytes, formatDate } from "../../../../lib/format";
import PortalSteps from "../../../../components/portal/PortalSteps";
import PrintButton from "../../../../components/portal/PrintButton";

export default async function ConfirmationPage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const eng = await loadEngagementFor(user, params.id);
  if (!eng || eng.user_id !== user.id) notFound();
  if (eng.status === "draft") redirect(`/engagement/${eng.id}/data`);

  const files = await loadFiles(eng.id);
  const service = SERVICES[eng.service];
  const a = assess(eng.service, eng.inputs, files, eng.requests);
  const status = STATUSES[eng.status];
  const stillNeeded = a.missingFields.length + a.missingDocs.length + a.openRequests.length;

  return (
    <div className="wrap">
      <PortalSteps current={3} engagementId={eng.id} solutionReady={eng.status === "solution_ready"} />
      <span className="eyebrow">Step 3 of 4 · Confirmation</span>
      <h1 className="page-title">
        {stillNeeded === 0 ? "Thank you — we have everything we need." : "Thank you — we've received your information."}
      </h1>
      <p className="sub" style={{ maxWidth: 700 }}>
        Reference <span className="mono">#{eng.id.slice(0, 8).toUpperCase()}</span> · {service.label} · submitted {formatDate(eng.submitted_at)}.
        {" "}<span className={`status-pill tone-${status.tone}`}>{status.label}</span>
      </p>
      <p className="sub" style={{ marginBottom: 22 }}>{status.clientHint}</p>

      <div className="stat-row">
        <div className="kpi"><span className="kpi-label">Completeness</span><span className="kpi-value">{a.percent}%</span></div>
        <div className="kpi"><span className="kpi-label">Questions answered</span><span className="kpi-value">{a.answered.length}</span></div>
        <div className="kpi"><span className="kpi-label">Files received</span><span className="kpi-value">{a.fileCount}</span></div>
        <div className="kpi"><span className="kpi-label">Items still needed</span><span className={`kpi-value ${stillNeeded ? "warn-text" : "good-text"}`}>{stillNeeded}</span></div>
      </div>

      <div className="confirm-grid">
        <section className="card">
          <h2 className="card-title"><span className="dot dot-warn" aria-hidden="true" />What we still need</h2>
          {stillNeeded === 0 ? (
            <p className="good-text">Nothing — every required item has been received.</p>
          ) : (
            <ul className="need-list">
              {a.openRequests.map((r) => (
                <li key={r.id}><strong>{r.label}</strong><span className="pill pill-req">Requested by consultant</span>{r.note && <p className="help">{r.note}</p>}</li>
              ))}
              {a.missingDocs.map((d) => (
                <li key={d.key}><strong>{d.label}</strong><span className="pill pill-req">Document</span></li>
              ))}
              {a.missingFields.map((f) => (
                <li key={f.key}><strong>{f.label}</strong><span className="pill pill-req">Question</span></li>
              ))}
            </ul>
          )}
          {a.optionalDocsNotProvided.length > 0 && (
            <>
              <h3 className="sub-head">Helpful if you have them (optional)</h3>
              <ul className="dot-list">
                {a.optionalDocsNotProvided.map((d) => <li key={d.key}>{d.label}</li>)}
              </ul>
            </>
          )}
          {eng.status !== "solution_ready" && (
            <Link href={`/engagement/${eng.id}/data`} className="button primary" style={{ marginTop: 16 }}>
              {stillNeeded ? "Add the missing information" : "Add or change information"}
            </Link>
          )}
        </section>

        <section className="card">
          <h2 className="card-title"><span className="dot dot-good" aria-hidden="true" />Documents received</h2>
          {a.docsReceived.length === 0 && a.otherFiles.length === 0 && a.fulfilledRequests.length === 0 ? (
            <p className="sub">No documents uploaded yet.</p>
          ) : (
            <ul className="received-list">
              {a.docsReceived.map((d) => (
                <li key={d.key}>
                  <strong>✓ {d.label}</strong>
                  {d.files.map((f) => <span key={f.id} className="file-line">{f.file_name} · {formatBytes(f.size_bytes)}</span>)}
                </li>
              ))}
              {a.fulfilledRequests.map((r) => (
                <li key={r.id}>
                  <strong>✓ {r.label}</strong>
                  {!isEmpty(eng.inputs[`req:${r.id}`]) && <span className="file-line">Reply: {eng.inputs[`req:${r.id}`]}</span>}
                  {files.filter((f) => f.doc_type === `req:${r.id}`).map((f) => <span key={f.id} className="file-line">{f.file_name} · {formatBytes(f.size_bytes)}</span>)}
                </li>
              ))}
              {a.otherFiles.length > 0 && (
                <li>
                  <strong>✓ Other files</strong>
                  {a.otherFiles.map((f) => <span key={f.id} className="file-line">{f.file_name} · {formatBytes(f.size_bytes)}</span>)}
                </li>
              )}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="card-title">Information you shared</h2>
        {service.sections.map((s) => {
          const rows = s.fields.filter((f) => !isEmpty(eng.inputs[f.key]));
          if (!rows.length) return null;
          return (
            <div key={s.title} className="answers">
              <h3 className="sub-head">{s.title}</h3>
              <dl>
                {rows.map((f) => (
                  <div key={f.key} className="answer-row">
                    <dt>{f.label}</dt>
                    <dd>{formatValue(f, eng.inputs[f.key])}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </section>

      <section className="card">
        <h2 className="card-title">What happens next</h2>
        <ol className="next-list">
          <li>We review everything you've shared{stillNeeded ? " and follow up on the outstanding items above" : ""}.</li>
          <li>If we need anything else, it will appear on this page and your dashboard as a request.</li>
          <li>We complete the analysis: {service.deliverables.join(", ").toLowerCase()}.</li>
          <li>Your solution is published to the <strong>Solution</strong> page — we'll let you know when it's ready.</li>
        </ol>
        <div className="btn-row">
          <Link href="/dashboard" className="button secondary">Go to my dashboard</Link>
          <PrintButton label="Print this confirmation" />
          {eng.status === "solution_ready" && <Link href={`/engagement/${eng.id}/solution`} className="button primary">View solution</Link>}
        </div>
      </section>
    </div>
  );
}
