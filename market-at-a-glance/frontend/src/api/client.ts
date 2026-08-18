import type { DashboardResponse, TradeLogResponse } from "./types";

// In local dev, "/api" is proxied to the backend by vite.config.ts. In
// production (e.g. deployed on Vercel), there's no dev proxy, so set
// VITE_API_BASE_URL to the deployed backend's URL — e.g.
// https://market-at-a-glance-api.onrender.com/api — as a Vercel project
// environment variable. See market-at-a-glance/DEPLOYMENT.md.
const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

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
