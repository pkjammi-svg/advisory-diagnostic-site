#!/usr/bin/env python3
"""End-to-end pipeline runner: seeds the instrument universe, ingests
prices/options/news, computes technicals + sentiment, and generates today's
strategy report (Stages 1-4 combined). This is what powers the dashboard's
data — run it once before starting the API server, and re-run it daily
(or via the APScheduler job in app/scheduler.py) to refresh.

Usage:
  python -m scripts.run_full_pipeline               # broad+sectoral indices + pilot stock batch
  python -m scripts.run_full_pipeline --stocks 200   # widen the F&O stock universe
  python -m scripts.run_full_pipeline --indices-only
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import init_db, get_session
from app.data.ingest import (
    seed_index_instruments, seed_fo_stock_instruments, ingest_prices_for_instrument,
    ingest_options_for_instrument, ingest_news_for_instrument, ingest_macro_news,
)
from app.analysis.pipeline import run_technical_analysis
from app.sentiment.pipeline import run_sentiment_analysis
from app.strategy.daily_report import run_daily_strategy_pipeline
from app.models import Instrument

logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stocks", type=int, default=40, help="number of F&O stocks to include (pilot batch)")
    parser.add_argument("--indices-only", action="store_true")
    args = parser.parse_args()

    print("=" * 78)
    print("Market at a Glance — full pipeline run (Stages 1-4)")
    print("=" * 78)
    init_db()

    with get_session() as session:
        instruments = seed_index_instruments(session)
        print(f"[seed] {len(instruments)} indices")

        if not args.indices_only:
            stock_instruments, fo_source = seed_fo_stock_instruments(session, limit=args.stocks)
            print(f"[seed] {len(stock_instruments)} F&O stocks (source={fo_source})")
            instruments += stock_instruments

        print(f"[ingest] fetching prices/options/news for {len(instruments)} instruments...")
        for i, inst in enumerate(instruments, 1):
            ingest_prices_for_instrument(session, inst, periods=120)
            if inst.has_derivatives:
                ingest_options_for_instrument(session, inst)
            ingest_news_for_instrument(session, inst)
            if i % 10 == 0 or i == len(instruments):
                print(f"    ...{i}/{len(instruments)} done")
        ingest_macro_news(session)

        print("[analysis] computing technicals + sentiment...")
        for inst in instruments:
            run_technical_analysis(session, inst)
            run_sentiment_analysis(session, inst)

        print("[strategy] running Stage 4 daily strategy pipeline...")
        report = run_daily_strategy_pipeline(session)

        print("\n" + "-" * 78)
        print(f"Trade date: {report['trade_date']}")
        print(f"Broad market regime (Nifty 50): {report['broad_regime'].regime} "
              f"(uncertain={report['broad_regime'].uncertainty})")
        for sr in report["sector_regimes"]:
            print(f"  - {sr.label}: {sr.regime}")
        print(f"Shortlist size: {report['shortlist_count']}  |  Candidates with a strategy: {report['candidate_count']}")
        print(f"Portfolio capital at risk: Rs.{report['portfolio'].total_capital_at_risk_inr:,.0f} "
              f"({report['portfolio'].pct_of_capital}% of capital)")
        for w in report["portfolio"].correlation_warnings:
            print(f"  [correlation warning] {w}")
        if report["no_trade_today"]:
            print("\nBEST PICK: none — no candidate cleared today's minimum score bar.")
        else:
            from app.models import StrategyPick
            best = session.query(StrategyPick).filter_by(id=report["best_pick_id"]).one()
            inst = session.query(Instrument).filter_by(id=best.instrument_id).one()
            print(f"\nBEST PICK: {inst.name} ({inst.symbol}) — {best.structure_type} — score {best.score}")
            print(f"  Max loss: Rs.{best.max_loss_inr:,.0f}  |  Max profit: {best.max_profit_inr}")
            print(f"  Entry trigger: {best.entry_trigger_text}")
            print(f"  Profit target: {best.profit_target_text}")
            print(f"  Stop-loss: {best.stop_loss_text}")
            print(f"  Time exit: {best.time_exit_date}")
            print(f"  Invalidation: {best.invalidation_text}")
        print("-" * 78)

    print("\nDone. Start the API with: uvicorn app.main:app --reload --port 8000")


if __name__ == "__main__":
    main()
