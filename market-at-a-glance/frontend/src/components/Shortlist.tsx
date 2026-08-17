import type { StrategyCard } from "../api/types";
import { trendColor } from "../lib/format";

export default function Shortlist({ shortlist, onSelect, selectedSymbol }: {
  shortlist: StrategyCard[];
  onSelect: (symbol: string) => void;
  selectedSymbol: string | null;
}) {
  return (
    <section className="max-w-7xl mx-auto px-4 pt-6">
      <h2 className="text-sm uppercase tracking-widest text-neutral-400 mb-2">
        Market-Wide Shortlist ({shortlist.length})
      </h2>
      <p className="text-xs text-neutral-500 mb-3">
        Every tracked index and F&amp;O stock is screened; these are the names that cleared the filter today. Click one to see its full read below.
      </p>
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900 text-neutral-400 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">Instrument</th>
              <th className="text-left px-3 py-2">Trend</th>
              <th className="text-left px-3 py-2">Score</th>
              <th className="text-left px-3 py-2">Why it made the cut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {shortlist.map((c) => (
              <tr
                key={c.instrument.symbol}
                onClick={() => onSelect(c.instrument.symbol)}
                className={`cursor-pointer hover:bg-neutral-900 ${selectedSymbol === c.instrument.symbol ? "bg-neutral-900" : ""} ${c.is_best_pick ? "bg-indigo-950/30" : ""}`}
              >
                <td className="px-3 py-2 text-neutral-500 font-mono">{c.rank}</td>
                <td className="px-3 py-2">
                  <span className="text-white font-medium">{c.instrument.name}</span>{" "}
                  <span className="text-neutral-500 text-xs">({c.instrument.symbol})</span>
                  {c.is_best_pick && (
                    <span className="ml-2 rounded bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 uppercase">Best Pick</span>
                  )}
                </td>
                <td className={`px-3 py-2 ${trendColor(c.technical?.trend_direction ?? "")}`}>
                  {c.technical?.trend_direction ?? "—"}
                </td>
                <td className="px-3 py-2 font-mono text-neutral-300">{c.score.toFixed(1)}</td>
                <td className="px-3 py-2 text-neutral-400 text-xs">{c.why_shortlisted_text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
