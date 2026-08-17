import type { DashboardResponse } from "../api/types";
import { trendBg } from "../lib/format";

export default function RegimeSummary({ data }: { data: DashboardResponse }) {
  return (
    <section className="max-w-7xl mx-auto px-4 pt-6">
      <h2 className="text-sm uppercase tracking-widest text-neutral-400 mb-2">Market Regime</h2>
      <div className={`rounded-lg border px-4 py-3 mb-3 ${trendBg(data.broad_market_regime.regime)}`}>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white">{data.broad_market_regime.label}</span>
          <span className="text-xs uppercase font-mono text-neutral-300">
            {data.broad_market_regime.regime.replace(/_/g, " ")}
            {data.broad_market_regime.uncertainty && " · high uncertainty"}
          </span>
        </div>
        {data.broad_market_regime.detail && (
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{data.broad_market_regime.detail}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {data.sector_regimes.map((s) => (
          <div key={s.label} className={`rounded-md border px-2.5 py-1.5 text-xs ${trendBg(s.regime)}`}>
            <span className="text-neutral-200 font-medium">{s.label}</span>
            <span className="text-neutral-400"> — {s.regime.replace(/_/g, " ")}</span>
          </div>
        ))}
      </div>
      {data.broad_market_regime.uncertainty && (
        <p className="text-xs text-amber-400 mt-2">
          ⚠ Broad-market regime is high-uncertainty today — sizing bias defaults toward smaller size / no new trade, not toward more aggressive positioning.
        </p>
      )}
    </section>
  );
}
