import numpy as np
import pandas as pd
import pytest

from app.analysis.technicals import compute_technicals, max_oi_support_resistance


def _make_uptrend_df(n=120):
    dates = pd.date_range(end=pd.Timestamp.utcnow().normalize(), periods=n, freq="D")
    close = 100 + np.linspace(0, 30, n) + np.random.default_rng(1).normal(0, 0.3, n)
    high = close + 1
    low = close - 1
    open_ = close - 0.2
    volume = np.full(n, 1_000_000.0)
    return pd.DataFrame({"ts": dates, "open": open_, "high": high, "low": low, "close": close, "volume": volume})


def test_compute_technicals_detects_uptrend():
    df = _make_uptrend_df()
    read = compute_technicals("TEST", df)
    assert read.trend_direction == "uptrend"
    assert read.ema20 > read.ema200
    assert 0 <= read.rsi14 <= 100
    assert read.summary_text  # non-empty plain-English summary


def test_compute_technicals_handles_short_history():
    df = _make_uptrend_df(n=10)
    read = compute_technicals("SHORT", df)
    assert read.close > 0
    assert read.summary_text


def test_max_oi_support_resistance():
    chain = pd.DataFrame([
        {"expiry": pd.Timestamp("2026-01-01").date(), "strike": 100, "ce_oi": 500, "pe_oi": 9000},
        {"expiry": pd.Timestamp("2026-01-01").date(), "strike": 110, "ce_oi": 12000, "pe_oi": 200},
        {"expiry": pd.Timestamp("2026-02-01").date(), "strike": 120, "ce_oi": 99999, "pe_oi": 99999},
    ])
    resistance, support = max_oi_support_resistance(chain)
    assert resistance == 110  # heaviest call OI in the nearest expiry only
    assert support == 100     # heaviest put OI in the nearest expiry only


def test_max_oi_support_resistance_empty():
    assert max_oi_support_resistance(pd.DataFrame()) == (None, None)
