"""Price/OHLCV ingestion.

Live path: `yfinance` (no API key). This is the free starting point named
in the build brief. It is unofficial for NSE index tickers and can be rate
limited or blocked from datacenter IPs (as it is in this sandbox — see
README for the network-policy note).

PAID-FEED SEAM: for production reliability/latency, swap this module's
`fetch_ohlcv()` live branch for Kite Connect (`kiteconnect.KiteConnect.
historical_data`), Upstox API, or Global Datafeeds — all give clean,
low-latency NSE OHLCV with proper corporate-action adjustment, which
yfinance does not guarantee for Indian tickers. Config keys for these are
already defined in app/config.py (KITE_API_KEY etc.) — wire them in here
without touching any downstream analysis code, since everything downstream
only depends on the PriceBar schema, not on which provider filled it.

Synthetic fallback: a deterministic (seeded by symbol) geometric random
walk, clearly tagged source="synthetic" in the DB and surfaced as such in
the UI. This exists ONLY so the rest of the pipeline (indicators, strategy
generation, dashboard) can be proven end-to-end without live market access.
Never treat synthetic bars as real prices.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta, date

import numpy as np
import pandas as pd

from app.config import PROVIDERS

logger = logging.getLogger(__name__)

# Roughly realistic anchor spot prices (as of build time) used only to seed
# the synthetic random walk so charts/indicators look plausible in demo mode.
SYNTHETIC_ANCHORS = {
    "NIFTY50": 24700, "NIFTYNEXT50": 68000, "NIFTYMIDCAP100": 56000,
    "NIFTYMIDCAP150": 20500, "NIFTYMIDCAPSELECT": 12300, "NIFTYSMALLCAP100": 17800,
    "NIFTYSMALLCAP250": 15900, "BANKNIFTY": 51000, "FINNIFTY": 23700,
    "NIFTYIT": 42500, "NIFTYAUTO": 24200, "NIFTYPHARMA": 21800, "NIFTYFMCG": 58000,
    "NIFTYMETAL": 9200, "NIFTYENERGY": 39500, "NIFTYPSUBANK": 7100,
    "NIFTYPVTBANK": 26200, "NIFTYREALTY": 980, "NIFTYMEDIA": 175,
}
_DEFAULT_STOCK_ANCHOR = 1500.0


def _seed_from_symbol(symbol: str) -> int:
    return int(hashlib.sha256(symbol.encode()).hexdigest()[:8], 16)


def _synthetic_ohlcv(symbol: str, periods: int, timeframe: str = "1d") -> pd.DataFrame:
    """Deterministic synthetic daily/intraday bars for demo/offline use."""
    rng = np.random.default_rng(_seed_from_symbol(symbol))
    anchor = SYNTHETIC_ANCHORS.get(symbol, _DEFAULT_STOCK_ANCHOR)

    # Slight per-symbol drift + volatility so instruments look distinct.
    drift = rng.uniform(-0.0006, 0.0009)
    vol = rng.uniform(0.008, 0.02)

    if timeframe == "1d":
        freq_days = 1
        end = datetime.utcnow().date()
        dates = [end - timedelta(days=freq_days * i) for i in range(periods)][::-1]
        # Skip weekends roughly (not exact NSE holiday calendar — fine for demo)
        dates = [d for d in dates if d.weekday() < 5]
        idx = pd.to_datetime(dates)
    else:
        end = datetime.utcnow()
        idx = pd.date_range(end=end, periods=periods, freq="15min")

    n = len(idx)
    log_returns = rng.normal(drift, vol, n)
    close = anchor * np.exp(np.cumsum(log_returns))
    open_ = np.concatenate([[anchor], close[:-1]])
    high = np.maximum(open_, close) * (1 + rng.uniform(0, vol, n))
    low = np.minimum(open_, close) * (1 - rng.uniform(0, vol, n))
    volume = rng.uniform(0.6, 1.6, n) * 1_000_000

    df = pd.DataFrame({
        "ts": idx, "open": open_, "high": high, "low": low, "close": close, "volume": volume,
    })
    df["source"] = "synthetic"
    return df


def fetch_ohlcv(symbol: str, yf_ticker: str | None, periods: int = 250,
                 timeframe: str = "1d") -> tuple[pd.DataFrame, str]:
    """Return (dataframe[ts,open,high,low,close,volume,source], source_label)."""
    if PROVIDERS.price_provider == "yfinance" and yf_ticker:
        try:
            import yfinance as yf

            interval = "1d" if timeframe == "1d" else "15m"
            period_str = f"{max(periods, 60)}d" if timeframe == "1d" else "5d"
            hist = yf.Ticker(yf_ticker).history(period=period_str, interval=interval)
            if hist is not None and not hist.empty:
                hist = hist.reset_index()
                ts_col = "Date" if "Date" in hist.columns else "Datetime"
                df = pd.DataFrame({
                    "ts": pd.to_datetime(hist[ts_col]).dt.tz_localize(None),
                    "open": hist["Open"], "high": hist["High"],
                    "low": hist["Low"], "close": hist["Close"],
                    "volume": hist.get("Volume", 0.0),
                })
                df["source"] = "yfinance"
                return df.tail(periods).reset_index(drop=True), "yfinance"
        except Exception as exc:  # noqa: BLE001
            logger.warning("yfinance fetch failed for %s (%s); falling back.", symbol, exc)

    if not PROVIDERS.allow_synthetic_fallback:
        raise RuntimeError(f"No live price data for {symbol} and synthetic fallback disabled.")

    return _synthetic_ohlcv(symbol, periods, timeframe), "synthetic"
