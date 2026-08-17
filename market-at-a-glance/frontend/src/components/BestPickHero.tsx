import type { StrategyCard } from "../api/types";
import { formatINR, structureLabel } from "../lib/format";

function ExitRow({ label, value, tone }: { label: string; value: string; tone?: "danger" | "warn" | "default" }) {
  const toneClass =
    tone === "danger" ? "border-red-800/60 bg-red-950/30" :
    tone === "warn" ? "border-amber-800/60 bg-amber-950/30" :
    "border-neutral-700 bg-neutral-800/40";
  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <div className="text-[11px] uppercase tracking-wide text-neutral-400 mb-0.5">{label}</div>
      <div className="text-sm text-neutral-100 leading-snug">{value}</div>
    </div>
  );
}

export default function BestPickHero({ pick, noTradeToday }: { pick: StrategyCard | null; noTradeToday: boolean }) {
  if (noTradeToday || !pick) {
    return (
      <section className="max-w-7xl mx-auto px-4 pt-6">
        <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-6 text-center">
          <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2">Today's Best Pick</div>
          <div className="text-2xl font-semibold text-neutral-200">No trade meets the bar today</div>
          <p className="text-neutral-400 text-sm mt-2 max-w-2xl mx-auto">
            No candidate cleared the minimum score threshold — that's an intentional guardrail, not a bug.
            On uncertain-regime days the bar is raised rather than lowered, so a quiet day here means
            sitting on your hands beats forcing a trade.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 pt-6">
      <div className="rounded-2xl border border-indigo-700/60 bg-gradient-to-b from-indigo-950/40 to-neutral-900 p-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-indigo-400 mb-1">Today's Best Pick</div>
            <div className="text-3xl font-bold text-white">
              {pick.instrument.name} <span className="text-neutral-400 text-lg font-normal">({pick.instrument.symbol})</span>
            </div>
            <div className="text-indigo-300 font-medium mt-1">{structureLabel(pick.structure_type)}</div>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <div className="text-[11px] text-neutral-400 uppercase">Max loss</div>
              <div className="text-red-400 font-mono text-lg">{formatINR(pick.max_loss_inr)}</div>
            </div>
            {pick.max_profit_inr != null && (
              <div>
                <div className="text-[11px] text-neutral-400 uppercase">Max profit</div>
                <div className="text-green-400 font-mono text-lg">{formatINR(pick.max_profit_inr)}</div>
              </div>
            )}
            <div>
              <div className="text-[11px] text-neutral-400 uppercase">Score</div>
              <div className="text-white font-mono text-lg">{pick.score.toFixed(1)}</div>
            </div>
          </div>
        </div>

        <ExitRow label="Entry trigger" value={pick.entry_trigger_text ?? "—"} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <ExitRow label="Profit target" value={pick.profit_target_text ?? "—"} />
          <ExitRow label="Stop-loss" value={pick.stop_loss_text ?? "—"} tone="warn" />
          <ExitRow label="Invalidation trigger (check daily)" value={pick.invalidation_text ?? "—"} tone="danger" />
          <ExitRow label="Time-based exit" value={pick.time_exit_date ? `Exit by ${pick.time_exit_date} regardless of P&L.` : "—"} />
        </div>

        <p className="text-xs text-neutral-500 mt-4 leading-relaxed">
          {pick.rationale_text}
        </p>
      </div>
    </section>
  );
}
