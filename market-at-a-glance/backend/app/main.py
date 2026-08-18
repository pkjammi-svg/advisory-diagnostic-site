"""FastAPI entrypoint — Market at a Glance backend.

Run: uvicorn app.main:app --reload --port 8000

On startup, if MAAG_AUTO_SEED_ON_STARTUP is true (default), this
auto-populates the database in a background thread when it's empty — this
matters on hosts with an ephemeral filesystem (e.g. Render's free tier),
where the SQLite DB is wiped on every cold start/redeploy and there's no
separate shell to run scripts/run_full_pipeline.py by hand. It also starts
an in-process scheduler (MAAG_ENABLE_SCHEDULER, default true) for periodic
refreshes, useful on single-process hosts that don't support running
app/scheduler.py as a second worker.
"""
from __future__ import annotations

import logging
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import DEPLOYMENT
from app.db import init_db, get_session
from app.models import StrategyPick
from app.api.routes import router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Market at a Glance API",
    description="Personal research/decision-support tool for Indian equity markets. Not investment advice.",
    version="1.0.0",
)

_DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_DEV_ORIGINS + DEPLOYMENT.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _db_is_empty() -> bool:
    with get_session() as session:
        return session.query(StrategyPick).count() == 0


def _seed_in_background():
    try:
        from app.pipeline_runner import run_full_pipeline
        logger.info("Auto-seed: database is empty, running full pipeline in the background "
                     "(stock_limit=%d)...", DEPLOYMENT.stock_limit)
        run_full_pipeline(stock_limit=DEPLOYMENT.stock_limit)
        logger.info("Auto-seed: complete.")
    except Exception:
        logger.exception("Auto-seed failed — dashboard will show empty/no-data state until "
                          "POST /api/pipeline/run or the next scheduled refresh succeeds.")


@app.on_event("startup")
def on_startup():
    init_db()

    if DEPLOYMENT.auto_seed_on_startup and _db_is_empty():
        threading.Thread(target=_seed_in_background, daemon=True).start()

    if DEPLOYMENT.enable_in_process_scheduler:
        from app.scheduler import start_background_scheduler
        start_background_scheduler(stock_limit=DEPLOYMENT.stock_limit)


app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {"app": "Market at a Glance API", "docs": "/docs"}
