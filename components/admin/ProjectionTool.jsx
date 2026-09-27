"use client";
import { useMemo, useState } from "react";
import { defaultAssumptions, project, PROJECTION_LINES } from "../../lib/projection";
import { formatNumber } from "../../lib/format";

const FIELDS = [
  ["price", "Price per unit"], ["unitsPerMonth", "Units / month (yr 1)"], ["growthPct", "Volume growth % / yr"],
  ["variableCostPct", "Direct cost % of price"], ["fixedMonthly", "Fixed costs / month"], ["salariesMonthly", "Salaries / month"],
  ["salaryInflationPct", "Salary increase % / yr"], ["marketingYear1", "Marketing yr 1"], ["marketingPctOfRevenue", "Marketing % rev (yr 2+)"],
  ["capex", "Setup capex"], ["depreciationYears", "Depreciation years"], ["taxPct", "Tax %"], ["openingCash", "Opening funding"]
];

export default function ProjectionTool({ inputs, onInsert }) {
  const [a, setA] = useState(() => defaultAssumptions(inputs));
  const result = useMemo(() => project(a), [a]);
  const isPct = (k) => k.endsWith("Pct");

  function toMarkdown() {
    const head = `| | ${result.rows.map((r) => `Year ${r.year}`).join(" | ")} |\n|---|${result.rows.map(() => "---").join("|")}|`;
    const body = PROJECTION_LINES.map(([k, label]) =>
      `| ${label} | ${result.rows.map((r) => (isPct(k) ? `${formatNumber(r[k], 1)}%` : formatNumber(r[k]))).join(" | ")} |`
    ).join("\n");
    const notes = `\n\n- Break-even year: ${result.breakEvenYear ? `Year ${result.breakEvenYear}` : "not within 5 years"}\n- Cumulative 5-year net profit: ${formatNumber(result.cumulativeProfit)}\n- Additional funding required (lowest cash point): ${formatNumber(result.fundingGap)}\n- Key assumptions: price ${formatNumber(a.price)}, ${formatNumber(a.unitsPerMonth)} units/month in year 1, ${a.growthPct}% annual growth, direct costs ${a.variableCostPct}% of price.`;
    return `${head}\n${body}${notes}`;
  }

  return (
    <div>
      <p className="help">Pre-filled from the client's answers. Adjust assumptions to test scenarios, then insert the table into the solution.</p>
      <div className="assump-grid">
        {FIELDS.map(([k, label]) => (
          <label key={k} className="assump">
            <span>{label}</span>
            <input type="number" step="any" value={a[k]} onChange={(e) => setA({ ...a, [k]: Number(e.target.value) || 0 })} />
          </label>
        ))}
      </div>
      <div className="stat-row compact">
        <div className="kpi"><span className="kpi-label">Break-even</span><span className="kpi-value">{result.breakEvenYear ? `Year ${result.breakEvenYear}` : "> 5 yrs"}</span></div>
        <div className="kpi"><span className="kpi-label">5-yr net profit</span><span className="kpi-value">{formatNumber(result.cumulativeProfit)}</span></div>
        <div className="kpi"><span className="kpi-label">Funding gap</span><span className={`kpi-value ${result.fundingGap ? "warn-text" : "good-text"}`}>{formatNumber(result.fundingGap)}</span></div>
        <div className="kpi"><span className="kpi-label">Yr 5 revenue</span><span className="kpi-value">{formatNumber(result.rows[4].revenue)}</span></div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th></th>{result.rows.map((r) => <th key={r.year} className="num">Year {r.year}</th>)}</tr></thead>
          <tbody>
            {PROJECTION_LINES.map(([k, label]) => (
              <tr key={k} className={["grossProfit", "ebitda", "netProfit", "closingCash"].includes(k) ? "strong-row" : ""}>
                <td>{label}</td>
                {result.rows.map((r) => (
                  <td key={r.year} className={`num ${r[k] < 0 ? "neg" : ""}`}>{isPct(k) ? `${formatNumber(r[k], 1)}%` : formatNumber(r[k])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="btn-row">
        <button className="secondary" onClick={() => onInsert(`## 5-year projected financials\n${toMarkdown()}`)}>Insert into solution</button>
        <button className="secondary" onClick={() => navigator.clipboard.writeText(toMarkdown())}>Copy as table</button>
      </div>
    </div>
  );
}
