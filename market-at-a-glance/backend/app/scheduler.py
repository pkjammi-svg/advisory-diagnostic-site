"""Scheduled refresh jobs, built on app.pipeline_runner.run_full_pipeline.

NSE trading hours are 09:15-15:30 IST (03:45-10:00 UTC). Default schedule:
  - 08:45 IST: full pre-market refresh (prices, options, news, technicals,
    sentiment, Stage 4 strategy regeneration)
  - Every 30 min from 09:00-15:30 IST: intraday refresh

Two ways to run this:

1. Standalone process (recommended if your host lets you run more than one
   process, e.g. a VPS or a paid Render background worker):
     python -m app.scheduler
   Runs in the foreground with a BlockingScheduler, separate from the API
   server process.

2. In-process, started from the API server itself (see app/main.py) — used
   on hosts where you only get a single web-service process (e.g. Render's
   free tier). start_background_scheduler() returns immediately; the
   scheduler runs on a background thread inside the same process as
   uvicorn, controlled by the MAAG_ENABLE_SCHEDULER env var.
"""
from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

from app.db import init_db
from app.pipeline_runner import run_full_pipeline

logger = logging.getLogger(__name__)


def full_refresh(stock_limit: int = 40):
    logger.info("Starting full pre-market refresh...")
    run_full_pipeline(stock_limit=stock_limit)
    logger.info("Full pre-market refresh complete.")


def intraday_refresh(stock_limit: int = 40):
    # Same pipeline — ingestion is idempotent and cheap to re-run; a
    # dedicated "prices/options only" fast path can be added later if
    # refresh latency becomes a concern on the full ~200-stock universe.
    logger.info("Starting intraday refresh...")
    run_full_pipeline(stock_limit=stock_limit)
    logger.info("Intraday refresh complete.")


def _add_jobs(scheduler, stock_limit: int):
    scheduler.add_job(lambda: full_refresh(stock_limit),
                       CronTrigger(hour=8, minute=45, day_of_week="mon-fri"), id="premarket")
    scheduler.add_job(lambda: intraday_refresh(stock_limit),
                       CronTrigger(hour="9-15", minute="0,30", day_of_week="mon-fri"), id="intraday")


def start_background_scheduler(stock_limit: int = 40) -> BackgroundScheduler:
    """Starts an in-process, non-blocking scheduler (daemon thread). Safe to
    call from a FastAPI startup event."""
    scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
    _add_jobs(scheduler, stock_limit)
    scheduler.start()
    logger.info("In-process scheduler started (pre-market 08:45 IST, intraday every 30 min 09:00-15:30 IST).")
    return scheduler


def start_blocking_scheduler(stock_limit: int = 40) -> None:
    """Standalone foreground process — run with `python -m app.scheduler`."""
    init_db()
    scheduler = BlockingScheduler(timezone="Asia/Kolkata")
    _add_jobs(scheduler, stock_limit)
    logger.info("Scheduler started. Pre-market refresh at 08:45 IST, intraday every 30 min 09:00-15:30 IST.")
    scheduler.start()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    start_blocking_scheduler()
