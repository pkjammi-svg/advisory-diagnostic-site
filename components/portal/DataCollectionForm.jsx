"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SERVICES, assess, docApplies, isEmpty } from "../../lib/services";
import FileUploader from "./FileUploader";

function Field({ field, value, onChange, disabled }) {
  const id = `f_${field.key}`;
  const label = (
    <label htmlFor={field.type === "multiselect" ? undefined : id} className="field-label">
      {field.label}
      {field.required ? <span className="req" aria-label="required"> *</span> : <span className="opt"> (optional)</span>}
    </label>
  );
  let control;
  if (field.type === "textarea") {
    control = <textarea id={id} rows={3} value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} />;
  } else if (field.type === "select") {
    control = (
      <select id={id} value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">Select…</option>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else if (field.type === "multiselect") {
    const arr = Array.isArray(value) ? value : [];
    control = (
      <fieldset className="checks" disabled={disabled}>
        <legend className="sr-only">{field.label}</legend>
        {field.options.map((o) => (
          <label key={o} className={`check ${arr.includes(o) ? "on" : ""}`}>
            <input type="checkbox" checked={arr.includes(o)}
              onChange={(e) => onChange(e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} />
            {o}
          </label>
        ))}
      </fieldset>
    );
  } else {
    control = (
      <div className="input-affix">
        {field.prefix && <span className="affix">{field.prefix}</span>}
        <input id={id} type={field.type === "number" ? "number" : "text"} inputMode={field.type === "number" ? "decimal" : undefined}
          step="any" value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
        {field.suffix && <span className="affix">{field.suffix}</span>}
      </div>
    );
  }
  return (
    <div className={`field ${field.type === "textarea" || field.type === "multiselect" ? "wide" : ""}`}>
      {label}
      {field.help && <p className="help">{field.help}</p>}
      {control}
    </div>
  );
}

export default function DataCollectionForm({ engagement, initialFiles }) {
  const service = SERVICES[engagement.service];
  const [inputs, setInputs] = useState(engagement.inputs || {});
  const [files, setFiles] = useState(initialFiles);
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState(null);
  const [dirty, setDirty] = useState(false);
  const router = useRouter();
  const locked = engagement.status === "solution_ready";
  const requests = engagement.requests || [];

  const a = useMemo(() => assess(engagement.service, inputs, files, requests), [inputs, files, requests, engagement.service]);
  const setField = (k) => (v) => { setInputs((prev) => ({ ...prev, [k]: v })); setDirty(true); };
  const filesFor = (docType) => files.filter((f) => f.doc_type === docType);
  const openRequests = requests.filter((r) => !r.resolved);

  async function save(submit) {
    setSaving(submit ? "submit" : "save");
    setMessage(null);
    const res = await fetch(`/api/engagements/${engagement.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs, submit })
    });
    const data = await res.json().catch(() => ({}));
    setSaving(null);
    if (!res.ok) {
      setMessage({ ok: false, text: data.error || "Could not save." });
      return;
    }
    setDirty(false);
    if (submit) {
      router.push(`/engagement/${engagement.id}/confirmation`);
      router.refresh();
    } else {
      setMessage({ ok: true, text: "Progress saved. You can come back and finish any time." });
    }
  }

  return (
    <div className="collect-layout">
      <div>
        {openRequests.length > 0 && (
          <section className="card request-card">
            <span className="badge warn">Requested by your consultant</span>
            <h2 className="card-title">Additional information needed</h2>
            {engagement.request_note && <p className="sub" style={{ whiteSpace: "pre-wrap" }}>{engagement.request_note}</p>}
            {openRequests.map((r) => (
              <div key={r.id} className="request-item">
                <strong>{r.label}</strong>
                {r.note && <p className="help">{r.note}</p>}
                <textarea rows={2} placeholder="Type a reply (optional if you upload a file)"
                  value={inputs[`req:${r.id}`] || ""} onChange={(e) => setField(`req:${r.id}`)(e.target.value)} disabled={locked} />
                <FileUploader engagementId={engagement.id} docType={`req:${r.id}`} files={filesFor(`req:${r.id}`)}
                  onChange={(next) => setFiles([...files.filter((f) => f.doc_type !== `req:${r.id}`), ...next])} disabled={locked} compact />
              </div>
            ))}
          </section>
        )}

        {service.sections.map((section, i) => (
          <section key={section.title} className="card">
            <span className="section-num">Part {i + 1}</span>
            <h2 className="card-title">{section.title}</h2>
            <div className="field-grid">
              {section.fields.map((f) => (
                <Field key={f.key} field={f} value={inputs[f.key]} onChange={setField(f.key)} disabled={locked} />
              ))}
            </div>
          </section>
        ))}

        <section className="card">
          <span className="section-num">Part {service.sections.length + 1}</span>
          <h2 className="card-title">Documents</h2>
          <p className="sub" style={{ marginBottom: 14 }}>
            Upload PDFs, Excel/CSV exports, Word files or images (up to 50 MB each). Excel data exported as CSV lets us analyse it fastest.
          </p>
          {service.documents.filter((d) => docApplies(d, inputs)).map((d) => (
            <div key={d.key} className="doc-row">
              <div className="doc-head">
                <span className={`doc-status ${filesFor(d.key).length ? "ok" : d.required ? "need" : "opt"}`} aria-hidden="true">
                  {filesFor(d.key).length ? "✓" : d.required ? "!" : "–"}
                </span>
                <span className="doc-label">{d.label}</span>
                <span className={`pill ${d.required ? "pill-req" : ""}`}>{d.required ? "Required" : "Optional"}</span>
              </div>
              <FileUploader engagementId={engagement.id} docType={d.key} files={filesFor(d.key)}
                onChange={(next) => setFiles([...files.filter((f) => f.doc_type !== d.key), ...next])} disabled={locked} compact />
            </div>
          ))}
          <div className="doc-row">
            <div className="doc-head">
              <span className="doc-status opt" aria-hidden="true">+</span>
              <span className="doc-label">Anything else you'd like to share</span>
              <span className="pill">Optional</span>
            </div>
            <FileUploader engagementId={engagement.id} docType="other" files={filesFor("other")}
              onChange={(next) => setFiles([...files.filter((f) => f.doc_type !== "other"), ...next])} disabled={locked} compact />
          </div>
        </section>
      </div>

      <aside className="collect-side">
        <div className="card sticky">
          <span className="mini-head">Your progress</span>
          <div className="progress-num">{a.percent}%</div>
          <div className="progress-bar" role="progressbar" aria-valuenow={a.percent} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${a.percent}%` }} />
          </div>
          <ul className="side-stats">
            <li><span>Questions answered</span><strong>{a.answered.length}</strong></li>
            <li><span>Required questions left</span><strong className={a.missingFields.length ? "warn-text" : ""}>{a.missingFields.length}</strong></li>
            <li><span>Files uploaded</span><strong>{a.fileCount}</strong></li>
            <li><span>Required documents left</span><strong className={a.missingDocs.length ? "warn-text" : ""}>{a.missingDocs.length}</strong></li>
            {requests.length > 0 && <li><span>Open requests</span><strong className={a.openRequests.length ? "warn-text" : ""}>{a.openRequests.length}</strong></li>}
          </ul>
          {!locked && (
            <>
              <button className="primary" style={{ width: "100%", marginTop: 14 }} onClick={() => save(true)} disabled={!!saving}>
                {saving === "submit" ? "Submitting…" : engagement.status === "draft" ? "Submit & review" : "Update & review"}
              </button>
              <button className="secondary" style={{ width: "100%", marginTop: 8 }} onClick={() => save(false)} disabled={!!saving}>
                {saving === "save" ? "Saving…" : "Save progress"}
              </button>
              <p className="help" style={{ marginTop: 10 }}>
                You can submit with documents still missing — the next page shows exactly what's outstanding.
              </p>
            </>
          )}
          {dirty && !saving && <p className="help warn-text">You have unsaved changes.</p>}
          {message && <p className={message.ok ? "success-text" : "error-text"}>{message.text}</p>}
          {!a.missingFields.length ? null : (
            <details className="missing-details">
              <summary>Required questions still open</summary>
              <ul>{a.missingFields.map((f) => <li key={f.key}>{f.label}</li>)}</ul>
            </details>
          )}
        </div>
      </aside>
    </div>
  );
}
