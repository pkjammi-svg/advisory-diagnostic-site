"""
Market at a Glance — central configuration.

This file is the single source of truth for:
  - the instrument universe (indices + F&O stocks) tracked by the app
  - which indices actually have listed NSE derivatives (has_derivatives flag)
  - risk/capital settings for the strategy generator
  - data-provider settings, including where to plug in a paid feed later

Everything here is deliberately overridable via environment variables so you
can move from the free/sample defaults to paid, production-grade data
sources without touching code elsewhere in the app.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data_store"
DATA_DIR.mkdir(exist_ok=True)

DB_PATH = os.environ.get("MAAG_DB_PATH", str(DATA_DIR / "market_at_a_glance.db"))
DATABASE_URL = f"sqlite:///{DB_PATH}"


# ---------------------------------------------------------------------------
# Account / risk settings — defaults per the build brief, all overridable.
# ---------------------------------------------------------------------------
@dataclass
class RiskConfig:
    total_capital_inr: float = float(os.environ.get("MAAG_CAPITAL_INR", 100_000))
    max_risk_per_trade_pct: float = float(os.environ.get("MAAG_MAX_RISK_PCT", 2.5))  # 2-3% default, configurable
    monthly_return_target_low_pct: float = 2.0
    monthly_return_target_high_pct: float = 5.0
    # Default hard stop-loss rule: exit if premium/spread value drops this % from entry.
    default_stop_loss_pct: float = float(os.environ.get("MAAG_DEFAULT_SL_PCT", 35.0))
    # Default profit-booking rule: exit at this % of max theoretical profit.
    default_profit_target_pct_of_max: float = float(os.environ.get("MAAG_DEFAULT_TP_PCT", 55.0))
    # Hold-till date: user holds positions until this date regardless of expiry.
    hold_until_date: str = os.environ.get("MAAG_HOLD_UNTIL", "2026-09-05")
    # Minimum composite score (0-100) a candidate must clear to be the Best Pick.
    best_pick_min_score: float = float(os.environ.get("MAAG_BEST_PICK_MIN_SCORE", 62.0))


RISK = RiskConfig()


# ---------------------------------------------------------------------------
# Data provider configuration.
#
# Free/no-key defaults are used out of the box (yfinance for OHLCV,
# nsepython-style NSE endpoints for the F&O master list + option chain,
# RSS + NewsAPI free tier for news). Paid feeds plug in via env vars below —
# nothing else in the codebase needs to change.
# ---------------------------------------------------------------------------
@dataclass
class DataProviderConfig:
    # --- Price/OHLCV ---
    # Free default: yfinance (no key). Set MAAG_PRICE_PROVIDER=kite / upstox /
    # global_datafeeds and the matching *_API_KEY to switch to a paid feed —
    # see backend/app/data/prices.py for the integration seam.
    price_provider: str = os.environ.get("MAAG_PRICE_PROVIDER", "yfinance")
    kite_api_key: str = os.environ.get("KITE_API_KEY", "")
    kite_access_token: str = os.environ.get("KITE_ACCESS_TOKEN", "")
    upstox_api_key: str = os.environ.get("UPSTOX_API_KEY", "")
    global_datafeeds_key: str = os.environ.get("GLOBAL_DATAFEEDS_KEY", "")

    # --- Options chain ---
    # Free default: NSE's public option-chain JSON endpoint (unofficial,
    # rate-limited, occasionally blocks datacenter IPs — a paid feed such as
    # Kite Connect / Sensibull-style data is recommended for reliability).
    options_provider: str = os.environ.get("MAAG_OPTIONS_PROVIDER", "nse")

    # --- News ---
    news_api_key: str = os.environ.get("NEWS_API_KEY", "")          # newsapi.org free tier
    gnews_api_key: str = os.environ.get("GNEWS_API_KEY", "")        # gnews.io free tier
    news_cache_hours: int = int(os.environ.get("MAAG_NEWS_CACHE_HOURS", 24))

    # --- Sentiment model ---
    # "lexicon" = built-in finance lexicon scorer (no dependency, always
    # available). Set MAAG_SENTIMENT_MODEL=finbert to use a pretrained
    # FinBERT model instead (requires `transformers` + `torch`, downloaded
    # once — see backend/app/sentiment/scorer.py).
    sentiment_model: str = os.environ.get("MAAG_SENTIMENT_MODEL", "lexicon")

    # HTTP request timeout for all outbound data calls.
    request_timeout_s: int = int(os.environ.get("MAAG_HTTP_TIMEOUT", 10))

    # When true (default), any provider that fails or is unreachable falls
    # back to a clearly-labeled synthetic dataset so the rest of the app
    # keeps working (useful in network-restricted environments, and for
    # local demos before you've wired up API keys).
    allow_synthetic_fallback: bool = os.environ.get("MAAG_ALLOW_SYNTHETIC_FALLBACK", "true").lower() == "true"


PROVIDERS = DataProviderConfig()


# ---------------------------------------------------------------------------
# Instrument universe.
# ---------------------------------------------------------------------------
@dataclass
class IndexDef:
    symbol: str                 # internal short code
    name: str                   # display name
    yf_ticker: str               # Yahoo Finance ticker (index)
    category: str                # "broad_market" | "sectoral"
    has_derivatives: bool        # listed NSE index options/futures?
    sector: str | None = None    # sector label for sectoral indices


# Broad market indices
BROAD_MARKET_INDICES = [
    IndexDef("NIFTY50", "Nifty 50", "^NSEI", "broad_market", True),
    IndexDef("NIFTYNEXT50", "Nifty Next 50", "^NSMIDCP", "broad_market", True),
    IndexDef("NIFTYMIDCAP100", "Nifty Midcap 100", "NIFTY_MIDCAP_100.NS", "broad_market", False),
    IndexDef("NIFTYMIDCAP150", "Nifty Midcap 150", "NIFTYMIDCAP150.NS", "broad_market", False),
    IndexDef("NIFTYMIDCAPSELECT", "Nifty Midcap Select", "NIFTY_MID_SELECT.NS", "broad_market", True),
    IndexDef("NIFTYSMALLCAP100", "Nifty Smallcap 100", "NIFTYSMLCAP100.NS", "broad_market", False),
    IndexDef("NIFTYSMALLCAP250", "Nifty Smallcap 250", "NIFTYSMLCAP250.NS", "broad_market", False),
]

# Sectoral indices. Only Bank Nifty and Fin Nifty carry listed derivatives;
# the rest are equity/context-only per NSE's contract specifications.
SECTORAL_INDICES = [
    IndexDef("BANKNIFTY", "Bank Nifty", "^NSEBANK", "sectoral", True, sector="Banking"),
    IndexDef("FINNIFTY", "Fin Nifty", "NIFTY_FIN_SERVICE.NS", "sectoral", True, sector="Financial Services"),
    IndexDef("NIFTYIT", "Nifty IT", "^CNXIT", "sectoral", False, sector="IT"),
    IndexDef("NIFTYAUTO", "Nifty Auto", "^CNXAUTO", "sectoral", False, sector="Auto"),
    IndexDef("NIFTYPHARMA", "Nifty Pharma", "^CNXPHARMA", "sectoral", False, sector="Pharma"),
    IndexDef("NIFTYFMCG", "Nifty FMCG", "^CNXFMCG", "sectoral", False, sector="FMCG"),
    IndexDef("NIFTYMETAL", "Nifty Metal", "^CNXMETAL", "sectoral", False, sector="Metal"),
    IndexDef("NIFTYENERGY", "Nifty Energy", "^CNXENERGY", "sectoral", False, sector="Energy"),
    IndexDef("NIFTYPSUBANK", "Nifty PSU Bank", "^CNXPSUBANK", "sectoral", False, sector="PSU Banking"),
    IndexDef("NIFTYPVTBANK", "Nifty Private Bank", "NIFTYPVTBANK.NS", "sectoral", False, sector="Private Banking"),
    IndexDef("NIFTYREALTY", "Nifty Realty", "^CNXREALTY", "sectoral", False, sector="Realty"),
    IndexDef("NIFTYMEDIA", "Nifty Media", "^CNXMEDIA", "sectoral", False, sector="Media"),
]

ALL_INDICES = BROAD_MARKET_INDICES + SECTORAL_INDICES
INDEX_BY_SYMBOL = {i.symbol: i for i in ALL_INDICES}
DERIVATIVE_INDEX_SYMBOLS = [i.symbol for i in ALL_INDICES if i.has_derivatives]

# Fallback F&O stock pilot batch (~40 liquid names) used when the live NSE
# F&O security-master fetch (backend/app/data/fo_universe.py) is unreachable.
# The live fetch is the source of truth and scales to the full ~200-name
# universe automatically; this list only keeps the app usable offline/in
# restricted networks and as a fast "pilot batch" per the suggested build
# order (stage 8).
FALLBACK_FO_STOCKS = [
    "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", "SBIN", "HINDUNILVR",
    "ITC", "BHARTIARTL", "KOTAKBANK", "LT", "AXISBANK", "BAJFINANCE", "ASIANPAINT",
    "MARUTI", "SUNPHARMA", "TITAN", "ULTRACEMCO", "WIPRO", "NESTLEIND",
    "HCLTECH", "TATAMOTORS", "TATASTEEL", "POWERGRID", "NTPC", "M&M",
    "ADANIENT", "ADANIPORTS", "JSWSTEEL", "COALINDIA", "BAJAJFINSV", "GRASIM",
    "TECHM", "DRREDDY", "CIPLA", "EICHERMOT", "HEROMOTOCO", "DIVISLAB",
    "BPCL", "ONGC", "HINDALCO", "SBILIFE", "HDFCLIFE", "BRITANNIA",
    "APOLLOHOSP", "TATACONSUM", "INDUSINDBK", "BAJAJ-AUTO", "UPL", "VEDL",
]

# Approximate F&O lot sizes for the derivative-eligible indices. NSE revises
# these periodically (roughly aligned to keep contract value in a target
# band) — treat these as reasonable defaults for sizing math only, and
# ALWAYS verify the live lot size on NSE's contract specifications page
# before placing a real order.
INDEX_LOT_SIZES = {
    "NIFTY50": 25,
    "BANKNIFTY": 15,
    "FINNIFTY": 25,
    "NIFTYMIDCAPSELECT": 50,
    "NIFTYNEXT50": 10,
}

# Known sector-proxy ETFs for sectoral indices without listed derivatives
# (used by the equity-idea strategy path). Not exhaustive — where no mapping
# exists, the strategy generator falls back to "trade top constituents"
# framing instead of a specific ETF ticker.
SECTOR_ETF_PROXY = {
    "NIFTYIT": "ITBEES",
    "NIFTYPSUBANK": "PSUBNKBEES",
    "NIFTYPHARMA": "PHARMABEES",
    "NIFTYFMCG": "FMCGIETF",
    "NIFTYMETAL": None,
    "NIFTYAUTO": None,
    "NIFTYENERGY": None,
    "NIFTYPVTBANK": None,
    "NIFTYREALTY": None,
    "NIFTYMEDIA": None,
}

DISCLAIMER = (
    "Personal analysis tool — not investment advice. Built for solo use to "
    "support my own trading decisions; nothing here is an offer, solicitation, "
    "or recommendation to any other person, and no output should be read as a "
    "guarantee of any return."
)
