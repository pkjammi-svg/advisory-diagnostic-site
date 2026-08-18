"""Shared entry point for running the full Stage 1-4 pipeline (seed
instruments, ingest prices/options/news, compute technicals + sentiment,
generate today's strategy report).

Used by three callers:
  - scripts/run_full_pipeline.py       (manual CLI run, prints a summary)
  - app/scheduler.py                    (pre-market / intraday cron refresh)
  - app/main.py                         (auto-seed on API server startup —
    important for a fresh deploy on a host with an ephemeral filesystem,
    e.g. Render's free tier: the SQLite DB is empty on every cold start, so
    the API populates it itself instead of requiring shell access to run
    the CLI script by hand.)
"""
from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.db import init_db, get_session
from app.data.ingest import (
    seed_index_instruments, seed_fo_stock_instruments, ingest_prices_for_instrument,
    ingest_options_for_instrument, ingest_news_for_instrument, ingest_macro_news,
)
from app.analysis.pipeline import run_technical_analysis
from app.sentiment.pipeline import run_sentiment_analysis
from app.strategy.daily_report import run_daily_strategy_pipeline

logger = logging.getLogger(__name__)


def run_full_pipeline(stock_limit: int = 40, indices_only: bool = False,
                       ensure_db: bool = True) -> dict:
    """Runs Stages 1-4 end to end and returns the Stage 4 summary dict from
    run_daily_strategy_pipeline. Safe to call repeatedly — ingestion is
    idempotent (existing rows are skipped) and today's StrategyPick rows are
    replaced, not duplicated."""
    if ensure_db:
        init_db()

    with get_session() as session:
        instruments = seed_index_instruments(session)
        logger.info("Seeded %d indices", len(instruments))

        if not indices_only:
            stock_instruments, fo_source = seed_fo_stock_instruments(session, limit=stock_limit)
            logger.info("Seeded %d F&O stocks (source=%s)", len(stock_instruments), fo_source)
            instruments += stock_instruments

        for inst in instruments:
            ingest_prices_for_instrument(session, inst, periods=120)
            if inst.has_derivatives:
                ingest_options_for_instrument(session, inst)
            ingest_news_for_instrument(session, inst)
        ingest_macro_news(session)

        for inst in instruments:
            run_technical_analysis(session, inst)
            run_sentiment_analysis(session, inst)

        report = run_daily_strategy_pipeline(session)
        logger.info(
            "Pipeline run complete: trade_date=%s shortlist=%d candidates=%d no_trade_today=%s",
            report["trade_date"], report["shortlist_count"], report["candidate_count"],
            report["no_trade_today"],
        )
        return report
