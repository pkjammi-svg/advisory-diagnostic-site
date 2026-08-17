import type { DashboardResponse, TradeLogResponse } from "./types";

const BASE = "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

export const api = {
  dashboard: () => req<DashboardResponse>("/dashboard"),
  tradeLog: () => req<TradeLogResponse>("/tradelog"),
  logTrade: (payload: {
    strategy_pick_id?: number | null;
    instrument_symbol: string;
    structure_type: string;
    entry_price?: number | null;
    position_size_units?: number | null;
    notes?: string | null;
  }) => req("/tradelog", { method: "POST", body: JSON.stringify(payload) }),
  closeTrade: (
    id: number,
    payload: { exit_price: number; status: string; pnl_inr?: number | null; notes?: string | null }
  ) => req(`/tradelog/${id}/close`, { method: "POST", body: JSON.stringify(payload) }),
  exportTradeLog: () => req<{ exported_at: string; payload: unknown }>("/tradelog/export"),
  clearTradeLog: (confirm: boolean) =>
    req("/tradelog/clear", { method: "POST", body: JSON.stringify({ confirm }) }),
  runPipeline: () => req("/pipeline/run", { method: "POST" }),
};
