"""Converts ORM rows / dataclasses into plain JSON-serializable dicts for
the API layer."""
from __future__ import annotations

import json
from datetime import date, datetime

from app.models import Instrument, ComputedIndicator, SentimentSnapshot, StrategyPick, TradeLogEntry


def _iso(v):
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    return v


def instrument_to_dict(inst: Instrument) -> dict:
    return {
        "symbol": inst.symbol, "name": inst.name, "kind": inst.kind,
        "category": inst.category, "sector": inst.sector,
        "has_derivatives": inst.has_derivatives,
    }


def technical_to_dict(tech: ComputedIndicator | None) -> dict | None:
    if tech is None:
        return None
    return {
        "as_of": _iso(tech.as_of), "close": tech.close,
        "ema20": tech.ema20, "ema50": tech.ema50, "ema200": tech.ema200, "adx": tech.adx,
        "rsi14": tech.rsi14, "macd": tech.macd, "macd_signal": tech.macd_signal, "macd_hist": tech.macd_hist,
        "stoch_k": tech.stoch_k, "stoch_d": tech.stoch_d, "atr": tech.atr,
        "bb_upper": tech.bb_upper, "bb_mid": tech.bb_mid, "bb_lower": tech.bb_lower,
        "hist_vol": tech.hist_vol, "pivot": tech.pivot, "r1": tech.r1, "r2": tech.r2,
        "s1": tech.s1, "s2": tech.s2, "swing_high": tech.swing_high, "swing_low": tech.swing_low,
        "max_oi_call_strike": tech.max_oi_call_strike, "max_oi_put_strike": tech.max_oi_put_strike,
        "volume_vs_avg20": tech.volume_vs_avg20, "obv": tech.obv,
        "trend_direction": tech.trend_direction, "momentum_state": tech.momentum_state,
        "summary_text": tech.summary_text,
    }


def sentiment_to_dict(sent: SentimentSnapshot | None, headlines: list[dict] | None = None) -> dict | None:
    if sent is None:
        return None
    return {
        "as_of": _iso(sent.as_of), "score": sent.score, "article_count": sent.article_count,
        "consensus": sent.consensus, "label": sent.label, "top_headlines": headlines or [],
    }


def strategy_pick_to_dict(pick: StrategyPick, inst: Instrument) -> dict:
    return {
        "id": pick.id, "trade_date": _iso(pick.trade_date),
        "instrument": instrument_to_dict(inst),
        "is_best_pick": pick.is_best_pick, "rank": pick.rank, "score": pick.score,
        "score_breakdown": json.loads(pick.score_breakdown_json) if pick.score_breakdown_json else None,
        "structure_type": pick.structure_type,
        "structure_legs": json.loads(pick.structure_json) if pick.structure_json else [],
        "entry_cost_inr": pick.entry_cost_inr, "max_profit_inr": pick.max_profit_inr,
        "max_loss_inr": pick.max_loss_inr,
        "breakevens": json.loads(pick.breakeven_json) if pick.breakeven_json else [],
        "position_size_units": pick.position_size_units,
        "capital_at_risk_inr": pick.capital_at_risk_inr,
        "rationale_text": pick.rationale_text, "why_shortlisted_text": pick.why_shortlisted_text,
        "entry_trigger_text": pick.entry_trigger_text,
        "entry_price_low": pick.entry_price_low, "entry_price_high": pick.entry_price_high,
        "profit_target_text": pick.profit_target_text, "stop_loss_text": pick.stop_loss_text,
        "stop_loss_pct": pick.stop_loss_pct, "stop_loss_inr": pick.stop_loss_inr,
        "time_exit_date": _iso(pick.time_exit_date), "invalidation_text": pick.invalidation_text,
    }


def trade_log_entry_to_dict(t: TradeLogEntry) -> dict:
    return {
        "id": t.id, "strategy_pick_id": t.strategy_pick_id, "trade_date": _iso(t.trade_date),
        "instrument_symbol": t.instrument_symbol, "structure_type": t.structure_type,
        "entry_price": t.entry_price, "exit_price": t.exit_price,
        "position_size_units": t.position_size_units, "status": t.status, "pnl_inr": t.pnl_inr,
        "notes": t.notes, "opened_at": _iso(t.opened_at), "closed_at": _iso(t.closed_at),
    }
