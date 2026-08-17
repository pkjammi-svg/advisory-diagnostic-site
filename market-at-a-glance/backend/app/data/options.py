"""Options chain ingestion — OI, IV, Greeks (delta approx), LTP.

Only derivative-eligible instruments (config.DERIVATIVE_INDEX_SYMBOLS, plus
individual F&O stocks) should ever be routed through this module — callers
must check `has_derivatives` first (see app/strategy/generator.py), because
NSE does not list options/futures on most sectoral indices.

Live path: NSE's public option-chain JSON endpoint
(`nseindia.com/api/option-chain-indices` / `...-equities`), the same one
`nsepython` wraps. It requires a warmed-up session (cookies from the HTML
page) and frequently blocks non-browser / datacenter traffic — exactly what
happens in this sandbox (see README). Treat 4xx/timeouts as "temporarily
unavailable", not as "this instrument has no options".

PAID-FEED SEAM: Kite Connect / Sensibull-grade data gives you clean Greeks
(real delta/theta/vega/gamma from their own pricing engine, not the
approximation used in the synthetic fallback below) and doesn't get
rate-limited. Swap the live branch for that API; downstream strategy code
only depends on the OptionChainRow schema.

Synthetic fallback: builds a plausible chain around the current spot price
with a realistic OI "smile" (heaviest OI a few strikes OTM on each side,
tapering further out) so the max-OI support/resistance logic in Stage 2 has
something real to compute against. Always tagged source="synthetic".
"""
from __future__ import annotations

import logging
from datetime import date, timedelta

import numpy as np
import pandas as pd

from app.config import PROVIDERS

logger = logging.getLogger(__name__)


def _next_two_expiries(today: date | None = None) -> list[date]:
    """Approximate next two Thursday (weekly/monthly) expiries."""
    today = today or date.today()
    days_ahead = (3 - today.weekday()) % 7  # Thursday = 3
    days_ahead = days_ahead or 7
    first = today + timedelta(days=days_ahead)
    second = first + timedelta(days=7)
    return [first, second]


def _strike_step(spot: float) -> float:
    if spot > 30000:
        return 100.0
    if spot > 10000:
        return 50.0
    if spot > 2000:
        return 20.0
    if spot > 500:
        return 10.0
    return 5.0


def _synthetic_chain(symbol: str, spot: float) -> pd.DataFrame:
    rng = np.random.default_rng(abs(hash(symbol)) % (2**32))
    step = _strike_step(spot)
    atm = round(spot / step) * step
    strikes = [atm + step * i for i in range(-10, 11)]
    rows = []
    for expiry in _next_two_expiries():
        for k in strikes:
            dist = (k - spot) / spot
            # OI smile: heaviest a bit OTM, tapering further away.
            call_oi = max(50_000, 900_000 * np.exp(-((dist - 0.02) ** 2) / 0.002)) * rng.uniform(0.8, 1.2)
            put_oi = max(50_000, 900_000 * np.exp(-((dist + 0.02) ** 2) / 0.002)) * rng.uniform(0.8, 1.2)
            iv_base = 13 + 6 * abs(dist) * 10  # simple smile, higher IV further OTM
            ce_iv = round(float(iv_base + rng.uniform(-1, 1)), 2)
            pe_iv = round(float(iv_base + rng.uniform(-1, 1)), 2)
            intrinsic_ce = max(0.0, spot - k)
            intrinsic_pe = max(0.0, k - spot)
            # Time value peaks ATM and decays with distance from spot (rough
            # Gaussian approximation of a real theta/vega profile), so far-OTM
            # strikes price meaningfully cheaper than ATM — this keeps spread
            # payoffs (debit vs. width) realistic instead of all strikes on a
            # near-month chain pricing near-identically.
            from math import erf, sqrt, exp as mexp
            days_to_expiry = max((expiry - _next_two_expiries()[0]).days, 0) + 7
            t_years = days_to_expiry / 365
            # IMPORTANT: the time-value *baseline* uses a fixed reference IV
            # (13, the dist=0 value of iv_base above), not each strike's own
            # smile-adjusted ce_iv/pe_iv. Using the strike's own (higher, for
            # OTM strikes) IV to scale its own baseline would partially
            # cancel the distance decay below and leave far-OTM strikes
            # priced almost as rich as ATM — exactly the bug that made
            # spread debits collapse to near-zero.
            reference_iv = 13.0
            atm_time_value = spot * 0.016 * (reference_iv / 14) * sqrt(t_years / (7 / 365))
            moneyness_z = dist / ((reference_iv / 100) * sqrt(t_years) + 1e-6)
            decay = mexp(-0.5 * moneyness_z ** 2)
            time_value = max(0.5, atm_time_value * decay)
            ce_ltp = round(intrinsic_ce + time_value * rng.uniform(0.85, 1.15), 2)
            pe_ltp = round(intrinsic_pe + time_value * rng.uniform(0.85, 1.15), 2)
            # crude delta approximation via normal CDF on distance/IV
            z = -dist / (ce_iv / 100 * sqrt(30 / 365) + 1e-6)
            ce_delta = round(0.5 * (1 + erf(z / sqrt(2))), 3)
            pe_delta = round(ce_delta - 1, 3)
            rows.append(dict(
                expiry=expiry, strike=k,
                ce_oi=round(call_oi), ce_oi_change=round(call_oi * rng.uniform(-0.1, 0.15)),
                ce_iv=ce_iv, ce_ltp=ce_ltp, ce_delta=ce_delta,
                ce_volume=round(call_oi * rng.uniform(0.1, 0.4)),
                pe_oi=round(put_oi), pe_oi_change=round(put_oi * rng.uniform(-0.1, 0.15)),
                pe_iv=pe_iv, pe_ltp=pe_ltp, pe_delta=pe_delta,
                pe_volume=round(put_oi * rng.uniform(0.1, 0.4)),
                underlying_spot=spot, source="synthetic",
            ))
    return pd.DataFrame(rows)


def fetch_option_chain(symbol: str, spot: float, is_index: bool = True) -> tuple[pd.DataFrame, str]:
    """Return (dataframe, source_label). Only call for has_derivatives=True instruments."""
    if PROVIDERS.options_provider == "nse":
        try:
            import requests

            session = requests.Session()
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; MarketAtAGlance/1.0)",
                "Accept": "application/json",
            }
            session.get("https://www.nseindia.com", headers=headers, timeout=PROVIDERS.request_timeout_s)
            endpoint = (
                "https://www.nseindia.com/api/option-chain-indices"
                if is_index else
                "https://www.nseindia.com/api/option-chain-equities"
            )
            resp = session.get(endpoint, params={"symbol": symbol}, headers=headers,
                                timeout=PROVIDERS.request_timeout_s)
            resp.raise_for_status()
            data = resp.json()
            rows = []
            for rec in data.get("records", {}).get("data", []):
                expiry = rec.get("expiryDate")
                strike = rec.get("strikePrice")
                ce, pe = rec.get("CE", {}), rec.get("PE", {})
                if not (ce or pe):
                    continue
                rows.append(dict(
                    expiry=pd.to_datetime(expiry).date(), strike=strike,
                    ce_oi=ce.get("openInterest", 0), ce_oi_change=ce.get("changeinOpenInterest", 0),
                    ce_iv=ce.get("impliedVolatility", 0), ce_ltp=ce.get("lastPrice", 0),
                    ce_delta=0.0, ce_volume=ce.get("totalTradedVolume", 0),
                    pe_oi=pe.get("openInterest", 0), pe_oi_change=pe.get("changeinOpenInterest", 0),
                    pe_iv=pe.get("impliedVolatility", 0), pe_ltp=pe.get("lastPrice", 0),
                    pe_delta=0.0, pe_volume=pe.get("totalTradedVolume", 0),
                    underlying_spot=data.get("records", {}).get("underlyingValue", spot),
                    source="nse",
                ))
            if rows:
                return pd.DataFrame(rows), "nse"
        except Exception as exc:  # noqa: BLE001
            logger.warning("Live NSE option chain fetch failed for %s (%s); falling back.", symbol, exc)

    if not PROVIDERS.allow_synthetic_fallback:
        raise RuntimeError(f"No live option chain for {symbol} and synthetic fallback disabled.")

    return _synthetic_chain(symbol, spot), "synthetic"
