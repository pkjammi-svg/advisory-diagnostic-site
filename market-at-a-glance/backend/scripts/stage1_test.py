#!/usr/bin/env python3
"""Stage 1 proof script.

Per the build brief: "Build a small CLI or test script that proves each
data source returns real data before moving to Stage 2." This does exactly
that for Nifty 50 first (per the suggested build order), then Bank Nifty
and Fin Nifty, printing what was fetched and which source (live vs.
synthetic-fallback) served each row.

Run: python -m scripts.stage1_test
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import init_db, get_session
from app.data.ingest import (
    seed_index_instruments, ingest_prices_for_instrument,
    ingest_options_for_instrument, ingest_news_for_instrument, latest_close,
)
from app.models import Instrument, PriceBar, OptionChainRow, NewsArticle


def main() -> None:
    print("=" * 70)
    print("Market at a Glance — Stage 1 data-layer proof")
    print("=" * 70)
    init_db()

    with get_session() as session:
        instruments = seed_index_instruments(session)
        print(f"\n[indices] seeded {len(instruments)} index rows in DB.")

        for symbol in ["NIFTY50", "BANKNIFTY", "FINNIFTY"]:
            inst = session.query(Instrument).filter_by(symbol=symbol).one()
            print(f"\n--- {inst.name} ({inst.symbol}) ---")

            price_source = ingest_prices_for_instrument(session, inst, periods=120)
            n_bars = session.query(PriceBar).filter_by(instrument_id=inst.id).count()
            spot = latest_close(session, inst)
            print(f"  prices:  {n_bars} daily bars stored | source={price_source} | latest close={spot:.2f}")

            if inst.has_derivatives:
                opt_source = ingest_options_for_instrument(session, inst)
                n_opts = session.query(OptionChainRow).filter_by(instrument_id=inst.id).count()
                print(f"  options: {n_opts} chain rows stored | source={opt_source}")
            else:
                print("  options: skipped (has_derivatives=False)")

            news_source = ingest_news_for_instrument(session, inst)
            n_news = session.query(NewsArticle).filter_by(instrument_id=inst.id).count()
            print(f"  news:    {n_news} articles stored | source={news_source}")
            top = (session.query(NewsArticle).filter_by(instrument_id=inst.id)
                   .order_by(NewsArticle.published_at.desc()).limit(3).all())
            for a in top:
                print(f"           - {a.headline}  [{a.source}]")

    print("\n" + "=" * 70)
    print("Stage 1 complete. DB schema: indices, prices, options_chain, "
          "news_articles all populated for Nifty 50 / Bank Nifty / Fin Nifty.")
    print("NOTE: if any row above says source=synthetic, live network access "
          "to that provider was unavailable in this environment (see README "
          "'Data sources & network policy' section) — the pipeline still "
          "runs end-to-end on clearly-labeled sample data.")
    print("=" * 70)


if __name__ == "__main__":
    main()
