"use client";
import { starterMatrix, matrixToMarkdown } from "../../lib/riskLibrary";

export default function RiskMatrixTool({ inputs, onInsert }) {
  const rows = starterMatrix(inputs?.processes || []);
  if (!rows.length) return <p className="help">The client hasn't selected any processes yet.</p>;
  return (
    <div>
      <p className="help">Starter risks and controls for the processes the client selected. Tailor after walkthroughs, then add owners and frequency.</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>#</th><th>Process</th><th>Risk</th><th>Control</th><th>Type</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}><td>{r.id}</td><td>{r.process}</td><td>{r.risk}</td><td>{r.control}</td><td>{r.type}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="btn-row">
        <button className="secondary" onClick={() => onInsert(`## Risk & control matrix\n${matrixToMarkdown(rows)}`)}>Insert into solution</button>
        <button className="secondary" onClick={() => navigator.clipboard.writeText(matrixToMarkdown(rows))}>Copy as table</button>
      </div>
    </div>
  );
}
