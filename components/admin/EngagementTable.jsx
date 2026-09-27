"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { SERVICES, STATUSES } from "../../lib/services";
import { formatDate } from "../../lib/format";

export default function EngagementTable({ rows }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [service, setService] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) =>
      (!status || r.status === status) &&
      (!service || r.service === service) &&
      (!s || [r.client_name, r.client_email, r.company_name, r.id].some((x) => x?.toLowerCase().includes(s)))
    );
  }, [rows, q, status, service]);

  return (
    <div className="card">
      <div className="filter-row">
        <input type="search" placeholder="Search client, company, email or ref…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={service} onChange={(e) => setService(e.target.value)} aria-label="Filter by service">
          <option value="">All services</option>
          {Object.values(SERVICES).map((s) => <option key={s.key} value={s.key}>{s.short}</option>)}
        </select>
        <span className="help">{filtered.length} of {rows.length}</span>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Service</th>
              <th>Status</th>
              <th className="num">Complete</th>
              <th className="num">Files</th>
              <th>Waiting on</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/admin/engagements/${r.id}`} className="row-link">{r.company_name || r.client_name || r.client_email}</Link>
                  <span className="help block">{r.client_name ? `${r.client_name} · ` : ""}{r.client_email}</span>
                </td>
                <td>{SERVICES[r.service].short}</td>
                <td><span className={`status-pill tone-${STATUSES[r.status].tone}`}>{STATUSES[r.status].label}</span></td>
                <td className="num">
                  <span className="mini-meter" aria-hidden="true"><span style={{ width: `${r.percent}%` }} /></span> {r.percent}%
                </td>
                <td className="num">{r.fileCount}</td>
                <td>{r.waitingOn}</td>
                <td>{formatDate(r.updated_at)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="help" style={{ textAlign: "center", padding: 24 }}>No requests match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
