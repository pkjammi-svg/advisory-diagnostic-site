"""F&O-eligible stock universe.

Per the build brief, the ~200-name F&O stock list should be pulled from
NSE's published F&O security master rather than hardcoded, since it changes
quarterly. This module tries that live fetch first and falls back to a
curated pilot batch (config.FALLBACK_FO_STOCKS) when NSE is unreachable —
which, in network-restricted environments (including this sandbox), it
generally will be.

PAID-FEED NOTE: Kite Connect's `instruments()` dump and Global Datafeeds
both publish a clean, versioned F&O instrument master with lot sizes and
tick sizes included — either is a more reliable source than scraping NSE's
CSV if you have a paid subscription. Swap the live-fetch branch below for
that call; the rest of the pipeline only cares about the returned symbol
list.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

import requests

from app.config import PROVIDERS, FALLBACK_FO_STOCKS

logger = logging.getLogger(__name__)

# NSE publishes the current F&O underlying list at this endpoint (unofficial,
# subject to change; NSE frequently blocks non-browser / datacenter traffic).
NSE_FO_SECURITY_MASTER_URL = (
    "https://archives.nseindia.com/content/fo/fo_mktlots.csv"
)

_cache: dict = {"symbols": None, "fetched_at": None, "source": None}
_CACHE_TTL = timedelta(hours=24)


def fetch_fo_universe(force_refresh: bool = False) -> tuple[list[str], str]:
    """Return (symbols, source) where source is 'nse_live' or 'fallback_static'."""
    now = datetime.utcnow()
    if (
        not force_refresh
        and _cache["symbols"]
        and _cache["fetched_at"]
        and now - _cache["fetched_at"] < _CACHE_TTL
    ):
        return _cache["symbols"], _cache["source"]

    symbols: list[str] | None = None
    if PROVIDERS.allow_synthetic_fallback or True:  # live attempt always made first
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; MarketAtAGlance/1.0)",
                "Accept": "text/csv,*/*",
            }
            resp = requests.get(
                NSE_FO_SECURITY_MASTER_URL,
                headers=headers,
                timeout=PROVIDERS.request_timeout_s,
            )
            resp.raise_for_status()
            lines = resp.text.strip().splitlines()
            parsed = []
            for line in lines[1:]:
                cols = [c.strip() for c in line.split(",")]
                if len(cols) > 1 and cols[1] and cols[1].isupper():
                    parsed.append(cols[1])
            if parsed:
                symbols = sorted(set(parsed))
        except Exception as exc:  # noqa: BLE001
            logger.warning("Live NSE F&O master fetch failed (%s); using fallback list.", exc)

    if symbols:
        _cache.update(symbols=symbols, fetched_at=now, source="nse_live")
        return symbols, "nse_live"

    # Fallback: curated pilot batch, clearly not the full ~200-name universe.
    _cache.update(symbols=list(FALLBACK_FO_STOCKS), fetched_at=now, source="fallback_static")
    return list(FALLBACK_FO_STOCKS), "fallback_static"
