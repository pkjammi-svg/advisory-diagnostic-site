"use client";
import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { formatBytes } from "../../lib/format";

const MAX_BYTES = 50 * 1024 * 1024;

// Upload slot for one document type. Uploads go straight to Supabase Storage
// using a signed URL issued by our API, then get recorded against the engagement.
export default function FileUploader({ engagementId, docType, files, onChange, disabled, canDelete = true, compact }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  async function uploadOne(file) {
    if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 50 MB.`);
    const signRes = await fetch(`/api/engagements/${engagementId}/upload-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docType, fileName: file.name })
    });
    const sign = await signRes.json();
    if (!signRes.ok) throw new Error(sign.error || "Could not start upload");

    const { error: upErr } = await createSupabaseBrowserClient()
      .storage.from("engagement-files")
      .uploadToSignedUrl(sign.path, sign.token, file, { contentType: file.type || "application/octet-stream" });
    if (upErr) throw new Error(upErr.message);

    const recRes = await fetch(`/api/engagements/${engagementId}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docType, fileName: file.name, path: sign.path, size: file.size })
    });
    const rec = await recRes.json();
    if (!recRes.ok) throw new Error(rec.error || "Could not save file");
    return rec.file;
  }

  async function handleFiles(list) {
    if (!list?.length) return;
    setBusy(true);
    setError("");
    const added = [];
    for (const f of Array.from(list)) {
      try {
        added.push(await uploadOne(f));
      } catch (err) {
        setError(err.message);
      }
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    if (added.length) onChange([...files, ...added]);
  }

  async function remove(file) {
    if (!confirm(`Remove ${file.file_name}?`)) return;
    const res = await fetch(`/api/files/${file.id}`, { method: "DELETE" });
    if (res.ok) onChange(files.filter((f) => f.id !== file.id));
    else setError((await res.json().catch(() => ({}))).error || "Could not remove file");
  }

  return (
    <div className={`uploader ${compact ? "compact" : ""}`}>
      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f) => (
            <li key={f.id}>
              <a href={`/api/files/${f.id}`} className="file-name">{f.file_name}</a>
              <span className="file-size">{formatBytes(f.size_bytes)}</span>
              {canDelete && !disabled && (
                <button type="button" className="link danger" onClick={() => remove(f)} aria-label={`Remove ${f.file_name}`}>Remove</button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <label className={`drop ${busy ? "busy" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}>
          <input ref={inputRef} type="file" multiple onChange={(e) => handleFiles(e.target.files)} disabled={busy} />
          {busy ? "Uploading…" : files.length ? "+ Add another file" : "Choose files or drag them here"}
        </label>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
