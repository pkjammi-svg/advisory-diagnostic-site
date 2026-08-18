"""Runs the technical-analysis engine for an instrument and persists the
result as a ComputedIndicator row."""
from __future__ import annotations

import pandas as pd
from sqlalchemy.orm import Session

from app.models import Instrument, PriceBar, OptionChainRow, ComputedIndicator
from app.analysis.technicals import compute_technicals, max_oi_support_resistance


def _price_history_df(session: Session, inst: Instrument) -> pd.DataFrame:
    rows = (session.query(PriceBar)
            .filter_by(instrument_id=inst.id, timeframe="1d")
            .order_by(PriceBar.ts.asc()).all())
    return pd.DataFrame([{
        "ts": r.ts, "open": r.open, "high": r.high, "low": r.low,
        "close": r.close, "volume": r.volume,
    } for r in rows])


def _option_chain_df(session: Session, inst: Instrument) -> pd.DataFrame:
    rows = session.query(OptionChainRow).filter_by(instrument_id=inst.id).all()
    return pd.DataFrame([{
        "expiry": r.expiry, "strike": r.strike, "ce_oi": r.ce_oi, "pe_oi": r.pe_oi,
    } for r in rows])


def run_technical_analysis(session: Session, inst: Instrument):
    price_df = _price_history_df(session, inst)
    if price_df.empty:
        return None

    max_oi_call = max_oi_put = None
    if inst.has_derivatives:
        chain_df = _option_chain_df(session, inst)
        max_oi_call, max_oi_put = max_oi_support_resistance(chain_df)

    read = compute_technicals(inst.symbol, price_df, max_oi_call, max_oi_put)

    as_of = price_df["ts"].max()
    existing = session.query(ComputedIndicator).filter_by(
        instrument_id=inst.id, timeframe="1d", as_of=as_of,
    ).one_or_none()
    if existing is None:
        existing = ComputedIndicator(instrument_id=inst.id, timeframe="1d", as_of=as_of)
        session.add(existing)

    for field in ("close", "ema20", "ema50", "ema200", "adx", "rsi14", "macd", "macd_signal",
                  "macd_hist", "stoch_k", "stoch_d", "atr", "bb_upper", "bb_mid",
                  "bb_lower", "hist_vol", "pivot", "r1", "r2", "s1", "s2",
                  "swing_high", "swing_low", "max_oi_call_strike", "max_oi_put_strike",
                  "volume_vs_avg20", "obv", "trend_direction", "momentum_state", "summary_text"):
        setattr(existing, field, getattr(read, field))

    session.commit()
    return read
