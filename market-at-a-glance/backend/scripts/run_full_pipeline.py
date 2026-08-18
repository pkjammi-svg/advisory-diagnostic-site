#!/usr/bin/env python3
"""CLI wrapper around app.pipeline_runner.run_full_pipeline — seeds the
instrument universe, ingests prices/options/news, computes technicals +
sentiment, and generates today's strategy report (Stages 1-4 combined).
This is what powers the dashboard's data — run it once before starting the
API server, and re-run it daily (or via the APScheduler job in
app/scheduler.py, or automatically on API startup — see app/main.py) to
refresh.

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

from app.db import get_session
from app.pipeline_runner import run_full_pipeline
from app.models import Instrument, StrategyPick

logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stocks", type=int, default=40, help="number of F&O stocks to include (pilot batch)")
    parser.add_argument("--indices-only", action="store_true")
    args = parser.parse_args()

    print("=" * 78)
    print("Market at a Glance — full pipeline run (Stages 1-4)")
    print("=" * 78)

    report = run_full_pipeline(stock_limit=args.stocks, indices_only=args.indices_only)

    with get_session() as session:
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
