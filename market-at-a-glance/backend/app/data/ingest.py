"""Ingestion orchestration: populate the DB from the data-layer modules.

This is the glue Stage 1 asks for: pull prices/options/news for every
tracked instrument and persist them with clear schema, ready for Stage 2+.
"""
from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.config import ALL_INDICES, IndexDef, PROVIDERS
from app.data.fo_universe import fetch_fo_universe
from app.data.prices import fetch_ohlcv
from app.data.options import fetch_option_chain
from app.data.news import fetch_news
from app.models import Instrument, PriceBar, OptionChainRow, NewsArticle

logger = logging.getLogger(__name__)


def upsert_instrument(session: Session, *, symbol: str, name: str, kind: str,
                       category: str | None, sector: str | None,
                       has_derivatives: bool, yf_ticker: str | None) -> Instrument:
    inst = session.query(Instrument).filter_by(symbol=symbol).one_or_none()
    if inst is None:
        inst = Instrument(symbol=symbol, name=name, kind=kind, category=category,
                           sector=sector, has_derivatives=has_derivatives, yf_ticker=yf_ticker)
        session.add(inst)
        session.flush()
    else:
        inst.name, inst.kind, inst.category = name, kind, category
        inst.sector, inst.has_derivatives, inst.yf_ticker = sector, has_derivatives, yf_ticker
    return inst


def seed_index_instruments(session: Session) -> list[Instrument]:
    out = []
    for idx in ALL_INDICES:
        out.append(upsert_instrument(
            session, symbol=idx.symbol, name=idx.name, kind="index",
            category=idx.category, sector=idx.sector,
            has_derivatives=idx.has_derivatives, yf_ticker=idx.yf_ticker,
        ))
    session.commit()
    return out


def seed_fo_stock_instruments(session: Session, limit: int | None = None) -> tuple[list[Instrument], str]:
    symbols, source = fetch_fo_universe()
    if limit:
        symbols = symbols[:limit]
    out = []
    for sym in symbols:
        out.append(upsert_instrument(
            session, symbol=sym, name=sym, kind="stock", category="fo_stock",
            sector=None, has_derivatives=True, yf_ticker=f"{sym}.NS",
        ))
    session.commit()
    return out, source


def ingest_prices_for_instrument(session: Session, inst: Instrument, periods: int = 250) -> str:
    df, source = fetch_ohlcv(inst.symbol, inst.yf_ticker, periods=periods, timeframe="1d")
    count = 0
    for _, row in df.iterrows():
        exists = session.query(PriceBar).filter_by(
            instrument_id=inst.id, timeframe="1d", ts=row["ts"].to_pydatetime()
            if hasattr(row["ts"], "to_pydatetime") else row["ts"],
        ).one_or_none()
        if exists:
            continue
        ts_val = row["ts"].to_pydatetime() if hasattr(row["ts"], "to_pydatetime") else row["ts"]
        session.add(PriceBar(
            instrument_id=inst.id, timeframe="1d", ts=ts_val,
            open=float(row["open"]), high=float(row["high"]), low=float(row["low"]),
            close=float(row["close"]), volume=float(row.get("volume", 0.0) or 0.0),
            source=row.get("source", source),
        ))
        count += 1
    session.commit()
    logger.info("Ingested %d new price bars for %s (source=%s)", count, inst.symbol, source)
    return source


def latest_close(session: Session, inst: Instrument) -> float | None:
    row = (session.query(PriceBar)
           .filter_by(instrument_id=inst.id, timeframe="1d")
           .order_by(PriceBar.ts.desc()).first())
    return row.close if row else None


def ingest_options_for_instrument(session: Session, inst: Instrument) -> str | None:
    if not inst.has_derivatives:
        return None
    spot = latest_close(session, inst)
    if spot is None:
        return None
    is_index = inst.kind == "index"
    df, source = fetch_option_chain(inst.symbol, spot, is_index=is_index)
    for _, row in df.iterrows():
        session.add(OptionChainRow(
            instrument_id=inst.id, expiry=row["expiry"], strike=float(row["strike"]),
            ce_oi=row["ce_oi"], ce_oi_change=row["ce_oi_change"], ce_iv=row["ce_iv"],
            ce_ltp=row["ce_ltp"], ce_delta=row["ce_delta"], ce_volume=row["ce_volume"],
            pe_oi=row["pe_oi"], pe_oi_change=row["pe_oi_change"], pe_iv=row["pe_iv"],
            pe_ltp=row["pe_ltp"], pe_delta=row["pe_delta"], pe_volume=row["pe_volume"],
            underlying_spot=row["underlying_spot"], source=row.get("source", source),
        ))
    session.commit()
    logger.info("Ingested %d option-chain rows for %s (source=%s)", len(df), inst.symbol, source)
    return source


def ingest_news_for_instrument(session: Session, inst: Instrument) -> str:
    query = inst.name
    articles, source = fetch_news(query, display_name=inst.name)
    added = 0
    for art in articles:
        exists = session.query(NewsArticle).filter_by(
            instrument_id=inst.id, url=art["url"],
        ).one_or_none()
        if exists:
            continue
        session.add(NewsArticle(
            instrument_id=inst.id, scope="instrument", headline=art["headline"],
            url=art["url"], source=art.get("source"), published_at=art["published_at"],
            provider=art.get("provider", source),
        ))
        added += 1
    session.commit()
    logger.info("Ingested %d new articles for %s (source=%s)", added, inst.symbol, source)
    return source


def ingest_macro_news(session: Session) -> str:
    macro_queries = ["crude oil", "RBI policy", "Fed rate", "USD INR"]
    total_source = "synthetic"
    for q in macro_queries:
        articles, source = fetch_news(q, display_name=q)
        total_source = source
        for art in articles:
            exists = session.query(NewsArticle).filter_by(
                instrument_id=None, url=art["url"],
            ).one_or_none()
            if exists:
                continue
            session.add(NewsArticle(
                instrument_id=None, scope="macro", headline=art["headline"],
                url=art["url"], source=art.get("source"), published_at=art["published_at"],
                provider=art.get("provider", source),
            ))
    session.commit()
    return total_source
