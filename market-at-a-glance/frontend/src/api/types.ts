export interface Instrument {
  symbol: string;
  name: string;
  kind: "index" | "stock";
  category: string | null;
  sector: string | null;
  has_derivatives: boolean;
}

export interface Technical {
  as_of: string;
  close: number;
  ema20: number; ema50: number; ema200: number;
  adx: number; rsi14: number;
  macd: number; macd_signal: number; macd_hist: number;
  stoch_k: number; stoch_d: number; atr: number;
  bb_upper: number; bb_mid: number; bb_lower: number;
  hist_vol: number;
  pivot: number; r1: number; r2: number; s1: number; s2: number;
  swing_high: number; swing_low: number;
  max_oi_call_strike: number | null; max_oi_put_strike: number | null;
  volume_vs_avg20: number; obv: number;
  trend_direction: "uptrend" | "downtrend" | "sideways";
  momentum_state: "bullish" | "bearish" | "neutral";
  summary_text: string;
}

export interface Headline {
  headline: string;
  url: string;
  source: string | null;
  score: number | null;
  published_at?: string;
}

export interface Sentiment {
  as_of: string;
  score: number;
  article_count: number;
  consensus: "consensus" | "conflicting" | "quiet";
  label: "bullish" | "bearish" | "neutral";
  top_headlines: Headline[];
}

export interface StrategyLeg {
  action: string;
  option_type: string;
  strike: number;
  premium: number;
  expiry: string;
}

export interface ScoreBreakdown {
  technical_sentiment: number;
  risk_reward: number;
  sr_distance: number;
  iv_fit: number;
  weights: Record<string, number>;
}

export interface StrategyCard {
  id: number;
  trade_date: string;
  instrument: Instrument;
  is_best_pick: boolean;
  rank: number;
  score: number;
  score_breakdown: ScoreBreakdown | null;
  structure_type: string;
  structure_legs: StrategyLeg[];
  entry_cost_inr: number | null;
  max_profit_inr: number | null;
  max_loss_inr: number | null;
  breakevens: number[];
  position_size_units: number | null;
  capital_at_risk_inr: number | null;
  rationale_text: string;
  why_shortlisted_text: string;
  entry_trigger_text: string | null;
  entry_price_low: number | null;
  entry_price_high: number | null;
  profit_target_text: string | null;
  stop_loss_text: string | null;
  stop_loss_pct: number | null;
  stop_loss_inr: number | null;
  time_exit_date: string | null;
  invalidation_text: string | null;
  technical: Technical | null;
  sentiment: Sentiment | null;
}

export interface RegimeSummary {
  label: string;
  regime: string;
  detail?: string;
  uncertainty: boolean;
}

export interface DashboardResponse {
  trade_date: string;
  meta: {
    app_name: string;
    disclaimer: string;
    capital_inr: number;
    max_risk_per_trade_pct: number;
    hold_until_date: string;
  };
  broad_market_regime: RegimeSummary;
  sector_regimes: RegimeSummary[];
  best_pick: StrategyCard | null;
  no_trade_today: boolean;
  runner_ups: StrategyCard[];
  shortlist: StrategyCard[];
  portfolio: {
    total_capital_at_risk_inr: number;
    pct_of_capital: number;
    candidate_count: number;
    correlation_warnings: string[];
  };
}

export interface TradeLogEntry {
  id: number;
  strategy_pick_id: number | null;
  trade_date: string;
  instrument_symbol: string;
  structure_type: string;
  entry_price: number | null;
  exit_price: number | null;
  position_size_units: number | null;
  status: string;
  pnl_inr: number | null;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface PerformanceStats {
  total_trades_logged: number;
  open_trades: number;
  closed_trades: number;
  win_rate_pct: number | null;
  avg_win_inr: number;
  avg_loss_inr: number;
  total_pnl_inr: number;
  max_drawdown_inr: number;
  stop_loss_hit_rate_pct: number | null;
  target_hit_rate_pct: number | null;
  invalidation_hit_rate_pct: number | null;
  time_exit_rate_pct: number | null;
}

export interface TradeLogResponse {
  trades: TradeLogEntry[];
  stats: PerformanceStats;
}
