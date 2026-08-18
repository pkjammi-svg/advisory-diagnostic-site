import { useState } from "react";
import type { TradeLogResponse, StrategyCard } from "../api/types";
import { api } from "../api/client";
import { formatINR } from "../lib/format";

function StatTile({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-green-400" : tone === "bad" ? "text-red-400" : "text-white";
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2">
      <div className="text-[10px] uppercase text-neutral-500">{label}</div>
      <div className={`font-mono text-lg ${color}`}>{value}</div>
    </div>
  );
}

export default function TradeLogPanel({
  data, bestPick, onChanged,
}: { data: TradeLogResponse; bestPick: StrategyCard | null; onChanged: () => void }) {
  const [entryPrice, setEntryPrice] = useState("");
  const [units, setUnits] = useState("1");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [exported, setExported] = useState(false);

  const stats = data.stats;

  async function handleLogBestPick() {
    if (!bestPick) return;
    setBusy(true);
    try {
      await api.logTrade({
        strategy_pick_id: bestPick.id,
        instrument_symbol: bestPick.instrument.symbol,
        structure_type: bestPick.structure_type,
        entry_price: entryPrice ? Number(entryPrice) : null,
        position_size_units: units ? Number(units) : null,
        notes: notes || null,
      });
      setEntryPrice(""); setNotes("");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleClose(id: number, status: string) {
    const exitPriceStr = window.prompt("Exit price / premium?");
    if (exitPriceStr === null) return;
    const pnlStr = window.prompt("Realised P&L in ₹ (optional, can compute manually)?") ?? undefined;
    setBusy(true);
    try {
      await api.closeTrade(id, {
        exit_price: Number(exitPriceStr),
        status,
        pnl_inr: pnlStr ? Number(pnlStr) : null,
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    const res = await api.exportTradeLog();
    const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `trade-log-backup-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    setExported(true);
  }

  async function handleClear() {
    if (!exported) {
      alert("Export a backup first — this action cannot be undone without it.");
      return;
    }
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setBusy(true);
    try {
      await api.clearTradeLog(true);
      setConfirmClear(false);
      setExported(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <h2 className="text-sm uppercase tracking-widest text-neutral-400 mb-2">
        Trade Log &amp; Performance — the tool's own report card
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
        <StatTile label="Total logged" value={String(stats.total_trades_logged)} />
        <StatTile label="Open" value={String(stats.open_trades)} />
        <StatTile label="Closed" value={String(stats.closed_trades)} />
        <StatTile label="Win rate" value={stats.win_rate_pct != null ? `${stats.win_rate_pct}%` : "—"} />
        <StatTile label="Avg win" value={formatINR(stats.avg_win_inr)} tone="good" />
        <StatTile label="Avg loss" value={formatINR(stats.avg_loss_inr)} tone="bad" />
        <StatTile label="Total P&L" value={formatINR(stats.total_pnl_inr, { showSign: true })} tone={stats.total_pnl_inr >= 0 ? "good" : "bad"} />
        <StatTile label="Max drawdown" value={formatINR(stats.max_drawdown_inr)} tone="bad" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <StatTile label="Stop-loss hit rate" value={stats.stop_loss_hit_rate_pct != null ? `${stats.stop_loss_hit_rate_pct}%` : "—"} />
        <StatTile label="Target hit rate" value={stats.target_hit_rate_pct != null ? `${stats.target_hit_rate_pct}%` : "—"} />
        <StatTile label="Invalidation exits" value={stats.invalidation_hit_rate_pct != null ? `${stats.invalidation_hit_rate_pct}%` : "—"} />
        <StatTile label="Time exits" value={stats.time_exit_rate_pct != null ? `${stats.time_exit_rate_pct}%` : "—"} />
      </div>

      {bestPick && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 mb-4 flex flex-wrap items-end gap-2">
          <div className="text-xs text-neutral-400 mr-2">
            Log today's Best Pick ({bestPick.instrument.symbol}) as taken:
          </div>
          <input value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} placeholder="entry price"
            className="bg-neutral-800 text-white text-xs rounded px-2 py-1 w-28 border border-neutral-700" />
          <input value={units} onChange={(e) => setUnits(e.target.value)} placeholder="units/lots"
            className="bg-neutral-800 text-white text-xs rounded px-2 py-1 w-24 border border-neutral-700" />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="notes (optional)"
            className="bg-neutral-800 text-white text-xs rounded px-2 py-1 flex-1 min-w-[120px] border border-neutral-700" />
          <button disabled={busy} onClick={handleLogBestPick}
            className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium">
            I took this trade
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-800 mb-3">
        <table className="min-w-full text-xs">
          <thead className="bg-neutral-900 text-neutral-400 uppercase">
            <tr>
              <th className="text-left px-2 py-2">Date</th>
              <th className="text-left px-2 py-2">Instrument</th>
              <th className="text-left px-2 py-2">Structure</th>
              <th className="text-left px-2 py-2">Entry</th>
              <th className="text-left px-2 py-2">Exit</th>
              <th className="text-left px-2 py-2">Status</th>
              <th className="text-left px-2 py-2">P&amp;L</th>
              <th className="text-left px-2 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {data.trades.length === 0 && (
              <tr><td colSpan={8} className="px-2 py-4 text-center text-neutral-500">No trades logged yet.</td></tr>
            )}
            {data.trades.map((t) => (
              <tr key={t.id}>
                <td className="px-2 py-1.5 text-neutral-400">{t.trade_date}</td>
                <td className="px-2 py-1.5 text-white">{t.instrument_symbol}</td>
                <td className="px-2 py-1.5 text-neutral-300">{t.structure_type}</td>
                <td className="px-2 py-1.5 font-mono text-neutral-300">{t.entry_price ?? "—"}</td>
                <td className="px-2 py-1.5 font-mono text-neutral-300">{t.exit_price ?? "—"}</td>
                <td className="px-2 py-1.5 text-neutral-400">{t.status}</td>
                <td className={`px-2 py-1.5 font-mono ${t.pnl_inr != null && t.pnl_inr < 0 ? "text-red-400" : "text-green-400"}`}>
                  {t.pnl_inr != null ? formatINR(t.pnl_inr, { showSign: true }) : "—"}
                </td>
                <td className="px-2 py-1.5">
                  {t.status === "open" && (
                    <div className="flex gap-1">
                      <button onClick={() => handleClose(t.id, "closed_target")} className="text-green-400 hover:underline">target</button>
                      <button onClick={() => handleClose(t.id, "closed_stop")} className="text-red-400 hover:underline">stop</button>
                      <button onClick={() => handleClose(t.id, "closed_time")} className="text-neutral-400 hover:underline">time</button>
                      <button onClick={() => handleClose(t.id, "closed_invalidation")} className="text-amber-400 hover:underline">invalid.</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <button onClick={handleExport} className="px-3 py-1.5 rounded border border-neutral-700 text-neutral-300 hover:bg-neutral-800">
          Export backup (JSON)
        </button>
        <button
          onClick={handleClear}
          disabled={busy}
          className={`px-3 py-1.5 rounded border text-xs ${confirmClear ? "border-red-600 bg-red-950 text-red-300" : "border-neutral-700 text-neutral-400 hover:bg-neutral-800"}`}
        >
          {confirmClear ? "Click again to permanently clear history" : "Clear history…"}
        </button>
        {exported && <span className="text-neutral-500">✓ backup downloaded</span>}
      </div>
    </section>
  );
}
