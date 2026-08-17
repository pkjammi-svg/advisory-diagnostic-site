import type { DashboardResponse } from "../api/types";
import { formatINR } from "../lib/format";

export default function PortfolioView({ data }: { data: DashboardResponse }) {
  const p = data.portfolio;
  return (
    <section className="max-w-7xl mx-auto px-4 pt-6">
      <h2 className="text-sm uppercase tracking-widest text-neutral-400 mb-2">Portfolio-Level View</h2>
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 flex flex-wrap gap-6 items-center">
        <div>
          <div className="text-[11px] text-neutral-500">Total capital at risk (all candidates today)</div>
          <div className="font-mono text-white text-lg">{formatINR(p.total_capital_at_risk_inr)} <span className="text-neutral-500 text-sm">({p.pct_of_capital}% of capital)</span></div>
        </div>
        <div>
          <div className="text-[11px] text-neutral-500">Candidates considered</div>
          <div className="font-mono text-white text-lg">{p.candidate_count}</div>
        </div>
      </div>
      {p.correlation_warnings.length > 0 && (
        <div className="mt-2 space-y-1">
          {p.correlation_warnings.map((w, i) => (
            <div key={i} className="text-xs text-amber-400 bg-amber-950/30 border border-amber-800/50 rounded px-3 py-2">
              ⚠ {w}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
