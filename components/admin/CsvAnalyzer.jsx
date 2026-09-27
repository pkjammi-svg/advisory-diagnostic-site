"use client";
import { useMemo, useState } from "react";
import { parseCsv, summarise, numericColumns } from "../../lib/csv";
import { formatNumber } from "../../lib/format";

// Compare performance from any uploaded CSV: pick a dimension (customer,
// salesperson, product, expense head…) and a numeric column to total.
export default function CsvAnalyzer({ files, onInsert }) {
  const csvFiles = files.filter((f) => /\.csv$/i.test(f.file_name));
  const [fileId, setFileId] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dimension, setDimension] = useState("");
  const [metric, setMetric] = useState("");
  const [topN, setTopN] = useState(15);

  async function load(id) {
    setFileId(id);
    setData(null);
    setError("");
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/files/${id}`);
      if (!res.ok) throw new Error("Could not download file");
      const parsed = parseCsv(await res.text());
      const nums = numericColumns(parsed.headers, parsed.records);
      setData({ ...parsed, nums });
      setDimension(parsed.headers.find((h) => !nums.includes(h)) || parsed.headers[0] || "");
      setMetric(nums[0] || "");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  const summary = useMemo(() => (data && dimension ? summarise(data.records, dimension, metric) : null), [data, dimension, metric]);
  const shown = summary ? summary.rows.slice(0, topN) : [];
  const max = shown.length ? Math.max(...shown.map((r) => Math.abs(r.total))) || 1 : 1;
  const top20 = summary ? Math.max(1, Math.ceil(summary.rows.length * 0.2)) : 0;
  const top20Share = summary ? summary.rows.slice(0, top20).reduce((s, r) => s + r.share, 0) : 0;

  function toMarkdown() {
    const m = metric || "Count";
    return `**${m} by ${dimension}** (top ${shown.length} of ${summary.rows.length})\n\n| Rank | ${dimension} | ${m} | Share | Cumulative | Entries | Average |\n|---|---|---|---|---|---|---|\n` +
      shown.map((r, i) => `| ${i + 1} | ${r.key} | ${formatNumber(r.total)} | ${formatNumber(r.share, 1)}% | ${formatNumber(r.cumulativeShare, 1)}% | ${r.count} | ${formatNumber(r.average)} |`).join("\n") +
      `\n\nTop 20% of ${dimension.toLowerCase()} values (${top20}) account for ${formatNumber(top20Share, 1)}% of ${m.toLowerCase()}.`;
  }

  if (!csvFiles.length) {
    return <p className="help">No CSV files uploaded yet. Ask the client for sales-by-customer, sales-by-salesperson, production or expense exports as CSV to compare performance here.</p>;
  }

  return (
    <div>
      <div className="filter-row">
        <select value={fileId} onChange={(e) => load(e.target.value)} aria-label="CSV file">
          <option value="">Choose a CSV file…</option>
          {csvFiles.map((f) => <option key={f.id} value={f.id}>{f.file_name}</option>)}
        </select>
        {data && (
          <>
            <label className="inline-label">Group by
              <select value={dimension} onChange={(e) => setDimension(e.target.value)}>
                {data.headers.map((h) => <option key={h}>{h}</option>)}
              </select>
            </label>
            <label className="inline-label">Total
              <select value={metric} onChange={(e) => setMetric(e.target.value)}>
                <option value="">Row count</option>
                {data.nums.map((h) => <option key={h}>{h}</option>)}
              </select>
            </label>
            <label className="inline-label">Show
              <select value={topN} onChange={(e) => setTopN(Number(e.target.value))}>
                {[10, 15, 25, 50, 1000].map((n) => <option key={n} value={n}>{n === 1000 ? "All" : `Top ${n}`}</option>)}
              </select>
            </label>
          </>
        )}
      </div>
      {loading && <p className="loading">Loading…</p>}
      {error && <p className="error-text">{error}</p>}
      {summary && (
        <>
          <p className="help">
            {data.records.length.toLocaleString()} rows · {summary.rows.length} distinct {dimension} · total {formatNumber(summary.grand)} ·
            top 20% of {dimension} = <strong>{formatNumber(top20Share, 1)}%</strong> of the total
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th className="num">#</th><th>{dimension}</th><th className="num">{metric || "Rows"}</th><th style={{ width: "28%" }}>Relative</th><th className="num">Share</th><th className="num">Cumulative</th><th className="num">Entries</th><th className="num">Average</th></tr>
              </thead>
              <tbody>
                {shown.map((r, i) => (
                  <tr key={r.key}>
                    <td className="num">{i + 1}</td>
                    <td>{r.key}</td>
                    <td className="num">{formatNumber(r.total)}</td>
                    <td><span className="rank-bar" title={`${r.key}: ${formatNumber(r.total)}`}><span style={{ width: `${(Math.abs(r.total) / max) * 100}%` }} className={r.total < 0 ? "neg" : ""} /></span></td>
                    <td className="num">{formatNumber(r.share, 1)}%</td>
                    <td className="num">{formatNumber(r.cumulativeShare, 1)}%</td>
                    <td className="num">{r.count}</td>
                    <td className="num">{formatNumber(r.average)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="btn-row">
            <button className="secondary" onClick={() => onInsert(toMarkdown())}>Insert into solution</button>
            <button className="secondary" onClick={() => navigator.clipboard.writeText(toMarkdown())}>Copy as table</button>
          </div>
        </>
      )}
    </div>
  );
}
