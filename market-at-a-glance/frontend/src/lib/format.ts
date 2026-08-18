export function formatINR(value: number | null | undefined, opts: { showSign?: boolean } = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = opts.showSign && value > 0 ? "+" : "";
  return `${sign}₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function formatNum(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

export function trendColor(trend: string): string {
  if (trend === "uptrend" || trend === "bullish" || trend === "trending_up") return "text-bull";
  if (trend === "downtrend" || trend === "bearish" || trend === "trending_down") return "text-bear";
  return "text-neutral-400";
}

export function trendBg(trend: string): string {
  if (trend === "uptrend" || trend === "bullish" || trend === "trending_up") return "bg-green-950/50 border-green-800";
  if (trend === "downtrend" || trend === "bearish" || trend === "trending_down") return "bg-red-950/50 border-red-800";
  if (trend === "high_uncertainty") return "bg-amber-950/50 border-amber-800";
  return "bg-neutral-800/50 border-neutral-700";
}

export function structureLabel(s: string): string {
  const map: Record<string, string> = {
    bull_call_spread: "Bull Call Spread",
    bear_put_spread: "Bear Put Spread",
    iron_condor: "Iron Condor",
    equity_long: "Equity — Long",
    equity_short: "Equity — Short",
  };
  return map[s] ?? s;
}
