import type { DashboardResponse } from "../api/types";
import { formatINR } from "../lib/format";

export default function Header({ data, onRefresh, refreshing }: {
  data: DashboardResponse;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const riskPerTrade = data.meta.capital_inr * data.meta.max_risk_per_trade_pct / 100;
  return (
    <header className="border-b border-neutral-800 bg-neutral-950/80 sticky top-0 z-10 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Market at a Glance</h1>
          <p className="text-xs text-neutral-400">
            {new Date(data.trade_date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            {" · "}Personal decision-support dashboard
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <div className="text-neutral-400 text-xs">Capital</div>
            <div className="text-white font-mono">{formatINR(data.meta.capital_inr)}</div>
          </div>
          <div className="text-right">
            <div className="text-neutral-400 text-xs">Max risk / trade</div>
            <div className="text-white font-mono">
              {data.meta.max_risk_per_trade_pct}% ({formatINR(riskPerTrade)})
            </div>
          </div>
          <div className="text-right">
            <div className="text-neutral-400 text-xs">Hold-until date</div>
            <div className="text-white font-mono">{data.meta.hold_until_date}</div>
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="ml-2 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium"
          >
            {refreshing ? "Refreshing…" : "Re-run strategy"}
          </button>
        </div>
      </div>
    </header>
  );
}
