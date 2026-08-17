import type { StrategyCard } from "../api/types";
import { formatINR, trendColor, structureLabel } from "../lib/format";

function SentimentBadge({ label, consensus }: { label: string; consensus: string }) {
  const color =
    label === "bullish" ? "bg-green-900/60 text-green-300 border-green-700" :
    label === "bearish" ? "bg-red-900/60 text-red-300 border-red-700" :
    "bg-neutral-800 text-neutral-300 border-neutral-600";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase ${color}`}>
      {label}{consensus === "conflicting" ? " · conflicting" : consensus === "quiet" ? " · quiet" : ""}
    </span>
  );
}

export default function InstrumentCard({ card }: { card: StrategyCard }) {
  const tech = card.technical;
  const sent = card.sentiment;
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 ${card.is_best_pick ? "border-indigo-600 bg-indigo-950/10" : "border-neutral-800 bg-neutral-900"}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-white font-semibold">
            {card.instrument.name} <span className="text-neutral-500 text-xs">({card.instrument.symbol})</span>
          </div>
          <div className="text-xs text-neutral-500">
            {card.instrument.has_derivatives ? "Derivatives-eligible" : "Equity-only (no listed F&O)"}
            {card.is_best_pick && <span className="text-indigo-400 font-medium"> · Best Pick</span>}
            {!card.is_best_pick && <span> · rank #{card.rank}</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-neutral-500">score</div>
          <div className="font-mono text-white">{card.score.toFixed(1)}</div>
        </div>
      </div>

      {tech && (
        <div className="text-xs bg-neutral-800/40 rounded-lg p-2.5">
          <div className="flex justify-between mb-1">
            <span className={`font-medium ${trendColor(tech.trend_direction)}`}>{tech.trend_direction} · {tech.momentum_state}</span>
            <span className="text-neutral-400 font-mono">close {tech.close.toLocaleString("en-IN")}</span>
          </div>
          <p className="text-neutral-400 leading-relaxed">{tech.summary_text}</p>
        </div>
      )}

      {sent && (
        <div className="text-xs">
          <div className="flex items-center gap-2 mb-1">
            <SentimentBadge label={sent.label} consensus={sent.consensus} />
            <span className="text-neutral-500 font-mono">{sent.score >= 0 ? "+" : ""}{sent.score.toFixed(2)} · {sent.article_count} articles</span>
          </div>
          <ul className="space-y-1">
            {sent.top_headlines.slice(0, 3).map((h, i) => (
              <li key={i} className="text-neutral-400">
                <a href={h.url} target="_blank" rel="noreferrer" className="hover:text-indigo-400 hover:underline">
                  {h.headline}
                </a>
                <span className="text-neutral-600"> — {h.source}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-neutral-800 pt-2.5 text-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="text-neutral-300 font-medium">{structureLabel(card.structure_type)}</span>
          {card.position_size_units ? <span className="text-neutral-500">size: {card.position_size_units}</span> : null}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-neutral-500">Max loss</div>
            <div className="text-red-400 font-mono">{formatINR(card.max_loss_inr)}</div>
          </div>
          <div>
            <div className="text-neutral-500">Max profit</div>
            <div className="text-green-400 font-mono">{card.max_profit_inr != null ? formatINR(card.max_profit_inr) : "n/a (uncapped/equity)"}</div>
          </div>
          <div>
            <div className="text-neutral-500">Capital at risk</div>
            <div className="text-neutral-200 font-mono">{formatINR(card.capital_at_risk_inr)}</div>
          </div>
        </div>
      </div>

      {card.score_breakdown && (
        <div className="text-[10px] text-neutral-500 flex flex-wrap gap-x-3 gap-y-0.5">
          <span>tech+sent {card.score_breakdown.technical_sentiment}</span>
          <span>risk/reward {card.score_breakdown.risk_reward}</span>
          <span>S/R distance {card.score_breakdown.sr_distance}</span>
          <span>IV fit {card.score_breakdown.iv_fit}</span>
        </div>
      )}

      <p className="text-[11px] text-neutral-500 italic leading-relaxed">{card.why_shortlisted_text}</p>
    </div>
  );
}
