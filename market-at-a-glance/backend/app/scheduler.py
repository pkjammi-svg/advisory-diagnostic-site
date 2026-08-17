"""APScheduler jobs: refresh data before market open and through the day.

NSE trading hours are 09:15-15:30 IST (03:45-10:00 UTC). Default schedule:
  - 08:45 IST (03:15 UTC): full pre-market refresh (prices, options, news,
    technicals, sentiment, Stage 4 strategy regeneration)
  - Every 30 min from 09:30-15:30 IST: intraday price + options refresh and
    Stage 4 regeneration (news is cached per config.PROVIDERS.news_cache_hours,
    so it isn't re-pulled every cycle)

Run with: python -m app.scheduler   (keeps running in the foreground)
In production, run this as a separate long-lived process from the API server.
"""
from __future__ import annotations

import logging

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

from app.db import init_db, get_session
from app.data.ingest import (
    seed_index_instruments, seed_fo_stock_instruments, ingest_prices_for_instrument,
    ingest_options_for_instrument, ingest_news_for_instrument, ingest_macro_news,
)
from app.analysis.pipeline import run_technical_analysis
from app.sentiment.pipeline import run_sentiment_analysis
from app.strategy.daily_report import run_daily_strategy_pipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


def full_refresh(stock_limit: int = 60):
    logger.info("Starting full pre-market refresh...")
    with get_session() as session:
        instruments = seed_index_instruments(session)
        stocks, _ = seed_fo_stock_instruments(session, limit=stock_limit)
        instruments += stocks
        for inst in instruments:
            ingest_prices_for_instrument(session, inst)
            if inst.has_derivatives:
                ingest_options_for_instrument(session, inst)
            ingest_news_for_instrument(session, inst)
        ingest_macro_news(session)
        for inst in instruments:
            run_technical_analysis(session, inst)
            run_sentiment_analysis(session, inst)
        run_daily_strategy_pipeline(session)
    logger.info("Full pre-market refresh complete.")


def intraday_refresh(stock_limit: int = 60):
    logger.info("Starting intraday refresh...")
    with get_session() as session:
        from app.models import Instrument
        instruments = session.query(Instrument).filter_by(is_active=True).all()
        for inst in instruments:
            ingest_prices_for_instrument(session, inst, periods=5)
            if inst.has_derivatives:
                ingest_options_for_instrument(session, inst)
        for inst in instruments:
            run_technical_analysis(session, inst)
        run_daily_strategy_pipeline(session)
    logger.info("Intraday refresh complete.")


def start():
    init_db()
    scheduler = BlockingScheduler(timezone="Asia/Kolkata")
    scheduler.add_job(full_refresh, CronTrigger(hour=8, minute=45, day_of_week="mon-fri"), id="premarket")
    scheduler.add_job(intraday_refresh, CronTrigger(hour="9-15", minute="0,30", day_of_week="mon-fri"), id="intraday")
    logger.info("Scheduler started. Pre-market refresh at 08:45 IST, intraday every 30 min 09:00-15:30 IST.")
    scheduler.start()


if __name__ == "__main__":
    start()
