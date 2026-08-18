"""SQLAlchemy ORM models — schema per the build brief:
indices, prices, options_chain, news_articles, computed_indicators,
plus strategy_picks and trade_log for Stage 4 output/history.
"""
from __future__ import annotations

import datetime as dt

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, Text, ForeignKey,
    UniqueConstraint, Index,
)
from sqlalchemy.orm import relationship

from app.db import Base


def utcnow() -> dt.datetime:
    return dt.datetime.utcnow()


class Instrument(Base):
    """Unified row for both indices and F&O stocks."""
    __tablename__ = "indices"  # kept per spec naming; holds indices + stocks

    id = Column(Integer, primary_key=True)
    symbol = Column(String(32), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    kind = Column(String(16), nullable=False)         # "index" | "stock"
    category = Column(String(32), nullable=True)        # broad_market | sectoral | fo_stock
    sector = Column(String(64), nullable=True)
    has_derivatives = Column(Boolean, default=False, nullable=False)
    yf_ticker = Column(String(64), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    prices = relationship("PriceBar", back_populates="instrument", cascade="all,delete-orphan")


class PriceBar(Base):
    __tablename__ = "prices"
    __table_args__ = (
        UniqueConstraint("instrument_id", "timeframe", "ts", name="uq_price_bar"),
        Index("ix_prices_instrument_tf_ts", "instrument_id", "timeframe", "ts"),
    )

    id = Column(Integer, primary_key=True)
    instrument_id = Column(Integer, ForeignKey("indices.id"), nullable=False)
    timeframe = Column(String(8), nullable=False)   # "1d" | "15m" etc.
    ts = Column(DateTime, nullable=False)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, default=0.0)
    source = Column(String(24), default="synthetic")  # "yfinance" | "nse" | "synthetic" | paid feed name

    instrument = relationship("Instrument", back_populates="prices")


class OptionChainRow(Base):
    __tablename__ = "options_chain"
    __table_args__ = (
        Index("ix_options_instrument_expiry_strike", "instrument_id", "expiry", "strike"),
    )

    id = Column(Integer, primary_key=True)
    instrument_id = Column(Integer, ForeignKey("indices.id"), nullable=False)
    fetched_at = Column(DateTime, default=utcnow)
    expiry = Column(Date, nullable=False)
    strike = Column(Float, nullable=False)

    ce_oi = Column(Float, default=0.0)
    ce_oi_change = Column(Float, default=0.0)
    ce_iv = Column(Float, default=0.0)
    ce_ltp = Column(Float, default=0.0)
    ce_delta = Column(Float, default=0.0)
    ce_volume = Column(Float, default=0.0)

    pe_oi = Column(Float, default=0.0)
    pe_oi_change = Column(Float, default=0.0)
    pe_iv = Column(Float, default=0.0)
    pe_ltp = Column(Float, default=0.0)
    pe_delta = Column(Float, default=0.0)
    pe_volume = Column(Float, default=0.0)

    underlying_spot = Column(Float, default=0.0)
    source = Column(String(24), default="synthetic")


class NewsArticle(Base):
    __tablename__ = "news_articles"
    __table_args__ = (
        UniqueConstraint("instrument_id", "url", name="uq_news_instrument_url"),
    )

    id = Column(Integer, primary_key=True)
    instrument_id = Column(Integer, ForeignKey("indices.id"), nullable=True)  # null = macro/global
    scope = Column(String(16), default="instrument")  # instrument | sector | macro | global
    headline = Column(Text, nullable=False)
    url = Column(String(512), nullable=False)
    source = Column(String(128), nullable=True)
    published_at = Column(DateTime, default=utcnow)
    fetched_at = Column(DateTime, default=utcnow)
    sentiment_score = Column(Float, nullable=True)   # -1..+1
    provider = Column(String(24), default="synthetic")  # newsapi | gnews | rss | synthetic


class ComputedIndicator(Base):
    __tablename__ = "computed_indicators"
    __table_args__ = (
        UniqueConstraint("instrument_id", "timeframe", "as_of", name="uq_indicator_snapshot"),
    )

    id = Column(Integer, primary_key=True)
    instrument_id = Column(Integer, ForeignKey("indices.id"), nullable=False)
    timeframe = Column(String(8), default="1d")
    as_of = Column(DateTime, default=utcnow)

    close = Column(Float)
    ema20 = Column(Float); ema50 = Column(Float); ema200 = Column(Float)
    adx = Column(Float)
    rsi14 = Column(Float)
    macd = Column(Float); macd_signal = Column(Float); macd_hist = Column(Float)
    stoch_k = Column(Float); stoch_d = Column(Float)
    atr = Column(Float)
    bb_upper = Column(Float); bb_mid = Column(Float); bb_lower = Column(Float)
    hist_vol = Column(Float)
    pivot = Column(Float); r1 = Column(Float); r2 = Column(Float); s1 = Column(Float); s2 = Column(Float)
    swing_high = Column(Float); swing_low = Column(Float)
    max_oi_call_strike = Column(Float, nullable=True)   # OI-based resistance
    max_oi_put_strike = Column(Float, nullable=True)    # OI-based support
    volume_vs_avg20 = Column(Float)
    obv = Column(Float)

    trend_direction = Column(String(16))     # uptrend | downtrend | sideways
    momentum_state = Column(String(16))      # bullish | bearish | neutral
    summary_text = Column(Text)


class SentimentSnapshot(Base):
    __tablename__ = "sentiment_snapshots"
    __table_args__ = (
        UniqueConstraint("instrument_id", "as_of", name="uq_sentiment_snapshot"),
    )

    id = Column(Integer, primary_key=True)
    instrument_id = Column(Integer, ForeignKey("indices.id"), nullable=False)
    as_of = Column(DateTime, default=utcnow)
    score = Column(Float, default=0.0)             # aggregate -1..+1
    article_count = Column(Integer, default=0)
    consensus = Column(String(16), default="none")  # "consensus" | "conflicting" | "quiet"
    label = Column(String(16), default="neutral")    # bullish | bearish | neutral


class StrategyPick(Base):
    """One row per candidate strategy generated on a given trading day
    (includes the shortlist runners-up and the Best Pick, flagged)."""
    __tablename__ = "strategy_picks"

    id = Column(Integer, primary_key=True)
    trade_date = Column(Date, nullable=False, index=True)
    instrument_id = Column(Integer, ForeignKey("indices.id"), nullable=False)
    is_best_pick = Column(Boolean, default=False)
    rank = Column(Integer, nullable=True)  # 1 = best pick among all candidates that day
    score = Column(Float, default=0.0)
    score_breakdown_json = Column(Text)   # json: technical/sentiment/rr/iv sub-scores

    structure_type = Column(String(32))     # bull_call_spread | bear_put_spread | iron_condor | equity_long | equity_short | none
    structure_json = Column(Text)           # legs, strikes, qty
    entry_cost_inr = Column(Float, nullable=True)
    max_profit_inr = Column(Float, nullable=True)
    max_loss_inr = Column(Float, nullable=True)
    breakeven_json = Column(Text, nullable=True)
    position_size_units = Column(Integer, nullable=True)
    capital_at_risk_inr = Column(Float, nullable=True)

    rationale_text = Column(Text)
    why_shortlisted_text = Column(Text)

    entry_trigger_text = Column(Text, nullable=True)
    entry_price_low = Column(Float, nullable=True)
    entry_price_high = Column(Float, nullable=True)
    profit_target_text = Column(Text, nullable=True)
    stop_loss_text = Column(Text, nullable=True)
    stop_loss_pct = Column(Float, nullable=True)
    stop_loss_inr = Column(Float, nullable=True)
    time_exit_date = Column(Date, nullable=True)
    invalidation_text = Column(Text, nullable=True)

    created_at = Column(DateTime, default=utcnow)


class TradeLogEntry(Base):
    """Manual trade log — "I took this trade" entries, linked to a
    StrategyPick. No auto-execution; this is a record-keeping table only."""
    __tablename__ = "trade_log"

    id = Column(Integer, primary_key=True)
    strategy_pick_id = Column(Integer, ForeignKey("strategy_picks.id"), nullable=True)
    trade_date = Column(Date, nullable=False)
    instrument_symbol = Column(String(32), nullable=False)
    structure_type = Column(String(32))
    entry_price = Column(Float, nullable=True)
    exit_price = Column(Float, nullable=True)
    position_size_units = Column(Integer, nullable=True)
    status = Column(String(16), default="open")   # open | closed_target | closed_stop | closed_time | closed_invalidation | closed_manual
    pnl_inr = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    opened_at = Column(DateTime, default=utcnow)
    closed_at = Column(DateTime, nullable=True)


class AuditExport(Base):
    """Backup snapshot recorded automatically before any destructive action
    on the trade log (guardrail: no silent history reset)."""
    __tablename__ = "audit_exports"

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=utcnow)
    reason = Column(String(64))
    payload_json = Column(Text)
