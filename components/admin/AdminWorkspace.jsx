"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { SERVICES, STATUSES, assess, formatValue, isEmpty } from "../../lib/services";
import { formatBytes, formatDate } from "../../lib/format";
import { markdownToHtml } from "../../lib/markdown";
import FileUploader from "../portal/FileUploader";
import ProjectionTool from "./ProjectionTool";
import CsvAnalyzer from "./CsvAnalyzer";
import RiskMatrixTool from "./RiskMatrixTool";

const TABS = [
  ["overview", "Client data"],
  ["requests", "Request more info"],
  ["analysis", "Analysis tools"],
  ["solution", "Solution"],
  ["notes", "Private notes"]
];

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function AdminWorkspace({ initialEngagement, initialFiles }) {
  const [eng, setEng] = useState(initialEngagement);
  const [files, setFiles] = useState(initialFiles);
  const [tab, setTab] = useState("overview");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(null);
  const service = SERVICES[eng.service];

  const [requests, setRequests] = useState(eng.requests || []);
  const [requestNote, setRequestNote] = useState(eng.request_note || "");
  const [notes, setNotes] = useState(eng.admin_notes || "");
  const [solution, setSolution] = useState(eng.solution || service.solutionTemplate);
  const [preview, setPreview] = useState(false);

  const clientFiles = files.filter((f) => f.doc_type !== "deliverable");
  const deliverables = files.filter((f) => f.doc_type === "deliverable");
  const a = useMemo(() => assess(eng.service, eng.inputs, clientFiles, eng.requests), [eng, clientFiles]);

  async function patch(body, label) {
    setBusy(label);
    setMsg(null);
    const res = await fetch(`/api/admin/engagements/${eng.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || "Save failed" });
      return false;
    }
    setEng(data.engagement);
    setMsg({ ok: true, text: `${label} — saved.` });
    return true;
  }

  function insert(md) {
    setSolution((s) => `${s.trim()}\n\n${md}\n`);
    setTab("solution");
    setMsg({ ok: true, text: "Inserted at the end of the solution. Review and save." });
  }

  async function aiDraft() {
    if (!confirm("Replace the current solution text with an AI-generated first draft? (You can still edit it before publishing.)")) return;
    setBusy("Drafting");
    setMsg(null);
    const res = await fetch(`/api/admin/engagements/${eng.id}/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extra: notes })
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) setMsg({ ok: false, text: data.error || "Draft failed" });
    else {
      setSolution(data.text);
      setMsg({ ok: true, text: "Draft generated — review carefully, then Save." });
    }
  }

  const docLabel = (t) =>
    t === "other" ? "Other" : t.startsWith("req:") ? `Request: ${(eng.requests || []).find((r) => `req:${r.id}` === t)?.label || ""}` : service.documents.find((d) => d.key === t)?.label || t;

  return (
    <>
      <div className="admin-head">
        <div>
          <Link href="/admin" className="link">← All clients</Link>
          <h1 className="page-title" style={{ marginTop: 8 }}>{eng.company_name || eng.client_name || eng.client_email}</h1>
          <p className="sub">
            {service.label} · {eng.client_name && `${eng.client_name} · `}<a className="link" href={`mailto:${eng.client_email}`}>{eng.client_email}</a> · Ref #{eng.id.slice(0, 8).toUpperCase()}
          </p>
          <p className="help">Started {formatDate(eng.created_at)}{eng.submitted_at && ` · submitted ${formatDate(eng.submitted_at)}`}{eng.solution_published_at && ` · solution published ${formatDate(eng.solution_published_at)}`}</p>
        </div>
        <div className="status-box">
          <label className="inline-label">Status
            <select value={eng.status} onChange={(e) => patch({ status: e.target.value }, "Status")} disabled={!!busy}>
              {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <div className="progress-bar small"><span style={{ width: `${a.percent}%` }} /></div>
          <span className="help">{a.percent}% of required information received</span>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
            {label}
            {k === "overview" && a.missingDocs.length + a.missingFields.length > 0 && <span className="tab-count">{a.missingDocs.length + a.missingFields.length}</span>}
            {k === "requests" && a.openRequests.length > 0 && <span className="tab-count">{a.openRequests.length}</span>}
          </button>
        ))}
      </div>

      {msg && <p className={msg.ok ? "success-text" : "error-text"} role="status">{msg.text}</p>}

      {tab === "overview" && (
        <div className="confirm-grid">
          <section className="card">
            <h2 className="card-title">Answers</h2>
            {service.sections.map((s) => (
              <div key={s.title} className="answers">
                <h3 className="sub-head">{s.title}</h3>
                <dl>
                  {s.fields.map((f) => (
                    <div key={f.key} className="answer-row">
                      <dt>{f.label}{f.required && " *"}</dt>
                      <dd>{isEmpty(eng.inputs[f.key]) ? <span className={f.required ? "warn-text" : "help"}>{f.required ? "Missing" : "—"}</span> : formatValue(f, eng.inputs[f.key])}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </section>
          <div>
            <section className="card">
              <h2 className="card-title">Checklist</h2>
              <ul className="need-list">
                {a.missingDocs.map((d) => <li key={d.key}><strong>{d.label}</strong><span className="pill pill-req">Missing doc</span></li>)}
                {a.missingFields.map((f) => <li key={f.key}><strong>{f.label}</strong><span className="pill pill-req">Missing answer</span></li>)}
                {a.openRequests.map((r) => <li key={r.id}><strong>{r.label}</strong><span className="pill pill-req">Open request</span></li>)}
              </ul>
              {a.complete && <p className="good-text">All required items received.</p>}
              {a.optionalDocsNotProvided.length > 0 && <p className="help">Optional not provided: {a.optionalDocsNotProvided.map((d) => d.label).join("; ")}</p>}
            </section>
            <section className="card">
              <h2 className="card-title">Client files ({clientFiles.length})</h2>
              {clientFiles.length === 0 ? <p className="help">No files yet.</p> : (
                <ul className="received-list">
                  {clientFiles.map((f) => (
                    <li key={f.id}>
                      <a className="link" href={`/api/files/${f.id}`}>{f.file_name}</a>
                      <span className="file-line">{docLabel(f.doc_type)} · {formatBytes(f.size_bytes)} · {formatDate(f.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {tab === "requests" && (
        <section className="card">
          <h2 className="card-title">Ask the client for more information</h2>
          <p className="help">Each item appears on the client's data page with its own reply box and upload slot, and on their confirmation page as "still needed".</p>
          {requests.map((r, i) => (
            <div key={r.id} className="request-edit">
              <input placeholder="What do you need? e.g. Customer-wise sales for FY24 as CSV" value={r.label}
                onChange={(e) => setRequests(requests.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <input placeholder="Optional note / instructions" value={r.note}
                onChange={(e) => setRequests(requests.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} />
              <label className="inline-label"><input type="checkbox" checked={r.resolved}
                onChange={(e) => setRequests(requests.map((x, j) => (j === i ? { ...x, resolved: e.target.checked } : x)))} /> Resolved</label>
              <button className="link danger" onClick={() => setRequests(requests.filter((_, j) => j !== i))}>Remove</button>
              {(!isEmpty(eng.inputs[`req:${r.id}`]) || clientFiles.some((f) => f.doc_type === `req:${r.id}`)) && (
                <div className="client-reply">
                  <strong>Client reply:</strong> {eng.inputs[`req:${r.id}`] || ""}
                  {clientFiles.filter((f) => f.doc_type === `req:${r.id}`).map((f) => <a key={f.id} className="link" href={`/api/files/${f.id}`}> {f.file_name}</a>)}
                </div>
              )}
            </div>
          ))}
          <button className="secondary" onClick={() => setRequests([...requests, { id: newId(), label: "", note: "", resolved: false }])}>+ Add item</button>
          <label className="field-label" style={{ marginTop: 16, display: "block" }}>Message to the client (shown above the items)</label>
          <textarea rows={3} value={requestNote} onChange={(e) => setRequestNote(e.target.value)} style={{ width: "100%" }} />
          <div className="btn-row">
            <button className="primary" disabled={!!busy} onClick={() => patch({ requests, request_note: requestNote, status: "needs_info" }, "Request sent")}>
              Save & mark "More info needed"
            </button>
            <button className="secondary" disabled={!!busy} onClick={() => patch({ requests, request_note: requestNote }, "Requests")}>Save without changing status</button>
          </div>
        </section>
      )}

      {tab === "analysis" && (
        <>
          {eng.service === "startup" && (
            <section className="card">
              <h2 className="card-title">5-year projected financials</h2>
              <ProjectionTool inputs={eng.inputs} onInsert={insert} />
            </section>
          )}
          {eng.service === "risk" && (
            <section className="card">
              <h2 className="card-title">Starter risk & control matrix</h2>
              <RiskMatrixTool inputs={eng.inputs} onInsert={insert} />
            </section>
          )}
          <section className="card">
            <h2 className="card-title">Performance comparison (CSV)</h2>
            <p className="help">Rank customers, salespeople, products or expense heads from any uploaded CSV — totals, share, cumulative share (Pareto) and averages.</p>
            <CsvAnalyzer files={clientFiles} onInsert={insert} />
          </section>
        </>
      )}

      {tab === "solution" && (
        <div className="solution-editor">
          <section className="card">
            <div className="editor-head">
              <h2 className="card-title">Solution write-up</h2>
              <div className="btn-row" style={{ margin: 0 }}>
                <button className="secondary" onClick={() => setPreview(!preview)}>{preview ? "Edit" : "Preview"}</button>
                <button className="secondary" disabled={!!busy} onClick={aiDraft}>{busy === "Drafting" ? "Drafting…" : "AI first draft"}</button>
                <button className="secondary" onClick={() => confirm("Reset to the blank template?") && setSolution(service.solutionTemplate)}>Reset to template</button>
              </div>
            </div>
            <p className="help">Markdown: <code>## Heading</code>, <code>- bullet</code>, <code>1. step</code>, <code>**bold**</code>, and <code>| tables |</code>.</p>
            {preview ? (
              <div className="md solution-body preview" dangerouslySetInnerHTML={{ __html: markdownToHtml(solution) }} />
            ) : (
              <textarea className="editor" value={solution} onChange={(e) => setSolution(e.target.value)} spellCheck />
            )}
            <div className="btn-row">
              <button className="secondary" disabled={!!busy} onClick={() => patch({ solution }, "Solution draft")}>Save draft</button>
              <button className="primary" disabled={!!busy}
                onClick={() => confirm("Publish this solution to the client? They will see it on their Solution page.") && patch({ solution, publish: true }, "Published")}>
                {eng.solution_published_at ? "Update published solution" : "Publish to client"}
              </button>
              {eng.solution_published_at && (
                <button className="link danger" disabled={!!busy} onClick={() => patch({ unpublish: true }, "Unpublished")}>Unpublish</button>
              )}
            </div>
            {eng.solution_published_at && <p className="good-text">Published {formatDate(eng.solution_published_at)} — the client can see it.</p>}
          </section>
          <section className="card">
            <h2 className="card-title">Deliverable files</h2>
            <p className="help">Excel models, SOP documents, flowcharts, decks. Visible to the client once the solution is published.</p>
            <FileUploader engagementId={eng.id} docType="deliverable" files={deliverables}
              onChange={(next) => setFiles([...files.filter((f) => f.doc_type !== "deliverable"), ...next])} />
          </section>
        </div>
      )}

      {tab === "notes" && (
        <section className="card">
          <h2 className="card-title">Private notes</h2>
          <p className="help">Only visible to consultants. Also passed to "AI first draft" as extra context.</p>
          <textarea rows={14} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: "100%" }} />
          <div className="btn-row">
            <button className="primary" disabled={!!busy} onClick={() => patch({ admin_notes: notes }, "Notes")}>Save notes</button>
          </div>
        </section>
      )}
    </>
  );
}
