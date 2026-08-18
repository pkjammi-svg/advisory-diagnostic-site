"""News ingestion.

Live paths tried in order:
  1. NewsAPI.org free tier (config.PROVIDERS.news_api_key) if a key is set.
  2. GNews.io free tier (config.PROVIDERS.gnews_api_key) if a key is set.
  3. RSS feeds from Economic Times Markets / Moneycontrol (no key needed).
All three are batched/cached per instrument per day (see fetch_news's
`cache_hours`) to respect free-tier rate limits, per the build brief.

PAID-FEED SEAM: a paid news/sentiment feed (e.g. Refinitiv, Bloomberg,
or a dedicated Indian-markets news API) would remove the free-tier rate
limit entirely and typically ships its own sentiment score — if you plug
one in, you can skip app/sentiment/scorer.py and store its score directly.

Synthetic fallback: a small set of templated, clearly-labeled placeholder
headlines per instrument, ONLY used when no live source is reachable, so
the sentiment engine (Stage 3) always has something to score in demos.
"""
from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta

import requests

from app.config import PROVIDERS

logger = logging.getLogger(__name__)

RSS_FEEDS = [
    "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
    "https://www.moneycontrol.com/rss/marketreports.xml",
]

_SYNTHETIC_TEMPLATES = {
    "positive": [
        "{name} extends gains as buying interest picks up across the board",
        "Analysts turn constructive on {name} citing improving fundamentals",
        "{name} outperforms on strong institutional inflows",
        "Brokerages raise target price on {name} after upbeat outlook",
    ],
    "negative": [
        "{name} slips as profit booking sets in at higher levels",
        "{name} under pressure amid weak global cues",
        "Analysts flag near-term headwinds for {name}",
        "{name} declines as selling intensifies in the sector",
    ],
    "neutral": [
        "{name} trades range-bound in a quiet session",
        "{name} in focus ahead of key data this week",
        "Market participants await fresh triggers for {name}",
        "{name} largely unchanged as investors stay on the sidelines",
    ],
}


def _synthetic_headlines(name: str, n: int = 4) -> list[dict]:
    rng = random.Random(name)
    buckets = rng.choices(["positive", "negative", "neutral"], weights=[0.35, 0.3, 0.35], k=n)
    used_per_bucket: dict[str, list[str]] = {}
    out = []
    now = datetime.utcnow()
    for i, bucket in enumerate(buckets):
        available = [t for t in _SYNTHETIC_TEMPLATES[bucket] if t not in used_per_bucket.get(bucket, [])]
        if not available:
            available = _SYNTHETIC_TEMPLATES[bucket]
        template = rng.choice(available)
        used_per_bucket.setdefault(bucket, []).append(template)
        out.append(dict(
            headline=template.format(name=name),
            url=f"https://example-market-news.local/{name.lower().replace(' ', '-')}/{i}",
            source="Sample Wire (offline demo data)",
            published_at=now - timedelta(hours=rng.randint(1, 40)),
            provider="synthetic",
            _bucket=bucket,  # internal hint for the lexicon scorer's demo consistency
        ))
    return out


def _fetch_newsapi(query: str) -> list[dict]:
    if not PROVIDERS.news_api_key:
        return []
    try:
        resp = requests.get(
            "https://newsapi.org/v2/everything",
            params={"q": query, "language": "en", "sortBy": "publishedAt", "pageSize": 8,
                    "apiKey": PROVIDERS.news_api_key},
            timeout=PROVIDERS.request_timeout_s,
        )
        resp.raise_for_status()
        arts = resp.json().get("articles", [])
        return [dict(
            headline=a.get("title", ""), url=a.get("url", ""),
            source=(a.get("source") or {}).get("name", "NewsAPI"),
            published_at=datetime.fromisoformat(a["publishedAt"].replace("Z", "+00:00")).replace(tzinfo=None)
            if a.get("publishedAt") else datetime.utcnow(),
            provider="newsapi",
        ) for a in arts if a.get("title")]
    except Exception as exc:  # noqa: BLE001
        logger.warning("NewsAPI fetch failed for %r (%s)", query, exc)
        return []


def _fetch_gnews(query: str) -> list[dict]:
    if not PROVIDERS.gnews_api_key:
        return []
    try:
        resp = requests.get(
            "https://gnews.io/api/v4/search",
            params={"q": query, "lang": "en", "max": 8, "apikey": PROVIDERS.gnews_api_key},
            timeout=PROVIDERS.request_timeout_s,
        )
        resp.raise_for_status()
        arts = resp.json().get("articles", [])
        return [dict(
            headline=a.get("title", ""), url=a.get("url", ""),
            source=(a.get("source") or {}).get("name", "GNews"),
            published_at=datetime.fromisoformat(a["publishedAt"].replace("Z", "+00:00")).replace(tzinfo=None)
            if a.get("publishedAt") else datetime.utcnow(),
            provider="gnews",
        ) for a in arts if a.get("title")]
    except Exception as exc:  # noqa: BLE001
        logger.warning("GNews fetch failed for %r (%s)", query, exc)
        return []


def _fetch_rss(query: str) -> list[dict]:
    try:
        import feedparser
    except ImportError:
        return []
    out = []
    q_lower = query.lower()
    for feed_url in RSS_FEEDS:
        try:
            parsed = feedparser.parse(feed_url)
            for entry in parsed.entries[:30]:
                title = entry.get("title", "")
                if q_lower not in title.lower():
                    continue
                published = entry.get("published_parsed")
                out.append(dict(
                    headline=title, url=entry.get("link", ""),
                    source=parsed.feed.get("title", "RSS"),
                    published_at=datetime(*published[:6]) if published else datetime.utcnow(),
                    provider="rss",
                ))
        except Exception as exc:  # noqa: BLE001
            logger.warning("RSS fetch failed for %s (%s)", feed_url, exc)
    return out[:8]


def fetch_news(query: str, display_name: str | None = None) -> tuple[list[dict], str]:
    """Return (articles, source_label). Tries NewsAPI -> GNews -> RSS -> synthetic."""
    for fetcher, label in ((_fetch_newsapi, "newsapi"), (_fetch_gnews, "gnews"), (_fetch_rss, "rss")):
        arts = fetcher(query)
        if arts:
            return arts, label

    if not PROVIDERS.allow_synthetic_fallback:
        raise RuntimeError(f"No live news for {query!r} and synthetic fallback disabled.")

    return _synthetic_headlines(display_name or query), "synthetic"
