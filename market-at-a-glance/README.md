# Market at a Glance

A personal decision-support dashboard for Indian equity markets: it scans NSE's
broad-market and sectoral indices plus the F&O-eligible stock universe,
combines technical analysis, news/sentiment scoring, and live options data
into a daily strategy report, and tracks its own track record over time.

This is a **research/decision-support tool for one person's own trading**,
not a product offered to others and not a broker connection — it never
places orders. Every output states risk in rupees and avoids
guaranteed-return language by design (see "Guardrails" below).

This app is entirely new and self-contained under `market-at-a-glance/` —
nothing in the rest of this repository was touched or depends on it.

## Architecture

```
market-at-a-glance/
├── backend/            FastAPI + SQLite (Python)
│   ├── app/
│   │   ├── config.py          instrument universe, risk settings, data-provider config
│   │   ├── models.py          SQLAlchemy schema (indices, prices, options_chain, news_articles, ...)
│   │   ├── data/               Stage 1 — ingestion (prices, options, news, F&O universe)
│   │   ├── analysis/           Stage 2 — technical indicators + plain-English reads
│   │   ├── sentiment/          Stage 3 — news sentiment scoring
│   │   ├── strategy/           Stage 4 — screener, regime, strategy generator, ranker, entry/exit, trade log
│   │   ├── api/                FastAPI routers + serializers
│   │   ├── scheduler.py        APScheduler pre-market + intraday refresh jobs
│   │   └── main.py             FastAPI app entrypoint
│   ├── scripts/
│   │   ├── stage1_test.py         CLI proof that Stage 1 data sources return real data
│   │   └── run_full_pipeline.py   seeds + runs Stages 1-4 end-to-end (also used to refresh data)
│   └── tests/                  pytest sanity tests for the analysis/strategy math
└── frontend/            React + TypeScript + Tailwind (Vite)
    └── src/
        ├── api/                 typed API client
        ├── components/          BestPickHero, RegimeSummary, Shortlist, InstrumentCard, TradeLogPanel, ...
        └── App.tsx
```

## Quick start

### 1. Backend

```bash
cd market-at-a-glance/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Stage 1 proof — confirms each data source returns real data for Nifty 50 / Bank Nifty / Fin Nifty
python -m scripts.stage1_test

# Seed the DB and run the full Stage 1-4 pipeline (indices + a pilot batch of F&O stocks)
python -m scripts.run_full_pipeline --stocks 40

# Start the API
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd market-at-a-glance/frontend
npm install
npm run dev
```

Open http://localhost:5173 — the Vite dev server proxies `/api/*` to the backend on port 8000.

### 3. Keep it fresh (optional)

```bash
cd market-at-a-glance/backend
python -m app.scheduler
```

Runs a pre-market refresh at 08:45 IST and an intraday refresh every 30 minutes
09:00–15:30 IST, Mon–Fri (APScheduler, IST timezone). Run this as a separate
long-lived process from the API server. You can also just re-run
`python -m scripts.run_full_pipeline` manually, or hit `POST /api/pipeline/run`
to regenerate today's strategy report from whatever data is already stored.

## Data sources & network policy — read this first

Per the build brief, Stage 1 uses **free, no-key data sources as the
starting point**:

- **Prices/OHLCV**: [`yfinance`](https://pypi.org/project/yfinance/) (no key required)
- **Options chain**: NSE's public option-chain JSON endpoint (the same one `nsepython` wraps)
- **News**: RSS feeds (Economic Times Markets, Moneycontrol) by default, with
  optional [NewsAPI](https://newsapi.org)/[GNews](https://gnews.io) free-tier keys

**Every one of these live paths is coded and will run for real** the moment
you run this somewhere with normal internet access. In *this* build/review
sandbox, outbound network access is restricted by org policy to a small
allowlist (PyPI, npm, GitHub, Anthropic) — `nseindia.com`, `finance.yahoo.com`
and news RSS hosts are all blocked at the proxy (403), which you can see for
yourself in the log output of `scripts/stage1_test.py` ("Live NSE ... fetch
failed ...; falling back").

So that the whole pipeline — indicators, sentiment, strategy generation, the
dashboard — could be built and proven end-to-end anyway, every data module
(`app/data/prices.py`, `app/data/options.py`, `app/data/news.py`,
`app/data/fo_universe.py`) **always tries the live source first** and only
falls back to a small, clearly-labeled synthetic/sample dataset
(`source="synthetic"` in the DB, "Sample Wire (offline demo data)" as the
news source in the UI) when the live call fails. Nothing in the fallback
path is presented as real market data.

**On your own machine**, once outbound access to `nseindia.com` and
`finance.yahoo.com` is available, the same code will pull real prices,
option chains, and news with no changes required.

### Plugging in a paid data feed

Free sources (yfinance, NSE's public endpoints) are unofficial, rate-limited,
and sometimes block datacenter IPs — fine for personal use, not something to
depend on for latency-sensitive trading. Each data module has a clearly
marked seam for a paid feed:

| Module | Paid feed seam |
|---|---|
| `app/data/prices.py` | Kite Connect `historical_data`, Upstox API, or Global Datafeeds — config keys already defined in `app/config.py` (`KITE_API_KEY`, `UPSTOX_API_KEY`, `GLOBAL_DATAFEEDS_KEY`) |
| `app/data/options.py` | Kite Connect / Sensibull-grade option-chain data with real Greeks instead of the approximated delta |
| `app/data/news.py` | Any paid news/sentiment API — can bypass `app/sentiment/scorer.py` entirely if the feed ships its own score |
| `app/data/fo_universe.py` | Kite Connect's `instruments()` dump or Global Datafeeds' instrument master (cleaner than scraping NSE's CSV) |

Set the relevant environment variables (see `app/config.py`) and swap the
live-fetch branch in the corresponding module — nothing downstream (Stage 2-5)
needs to change, since everything else only depends on the stored schema.

## Scope of this build

Per the suggested build order, the pipeline was built and validated on
Nifty 50 first, then Bank Nifty/Fin Nifty, then the rest of the index
universe, then a stock pilot batch — and the architecture is generic across
that whole path (nothing is Nifty-specific). Defaults for this build:

- **All indices** in the brief are configured with correct `has_derivatives`
  flags (`app/config.py`): Nifty 50, Bank Nifty, Fin Nifty, Nifty Midcap
  Select and Nifty Next 50 route to options structures; the rest (Nifty IT,
  Auto, Pharma, FMCG, Metal, Energy, PSU Bank, Private Bank, Realty, Media,
  Midcap 100/150, Smallcap 100/250) route to equity/ETF ideas.
- **F&O stock universe**: `app/data/fo_universe.py` fetches NSE's live
  security master and falls back to a 48-name liquid pilot batch
  (`config.FALLBACK_FO_STOCKS`) when that's unreachable. `run_full_pipeline.py`
  defaults to a `--stocks 40` pilot batch for a fast local run — raise it
  (e.g. `--stocks 200`) once you're running against live data and want the
  full universe; nothing else needs to change.
- **Sizing math** (lot sizes, ATM-time-value pricing in the synthetic
  fallback) is deliberately conservative/approximate — see inline comments
  in `app/config.py` (`INDEX_LOT_SIZES`) and `app/data/options.py`. Always
  verify lot sizes and live premiums against NSE before acting on any output.

## Non-negotiable guardrails (built in, not configurable away)

- Every strategy output shows **max loss in rupees**, not just a percentage.
- No output ever uses "will" or "guaranteed" — language is "target" / "if
  [scenario] plays out" throughout (`app/strategy/entry_exit.py`,
  `app/strategy/generator.py`).
- On a `high_uncertainty` market regime day, the Best Pick's score bar is
  **raised** (`RISK.best_pick_min_score + 8`), biasing toward smaller
  size/no trade rather than a more aggressive pick
  (`app/strategy/ranker.py::select_best_pick`).
- The trade log has no silent "clear" — `POST /api/tradelog/clear` requires
  `confirm=true` and always writes a full backup snapshot
  (`AuditExport`) before deleting anything; the UI forces an export download
  first (`TradeLogPanel.tsx`).
- The Best Pick hero always ships entry trigger, profit target, stop-loss
  (in both % and ₹), invalidation trigger, and the fixed hold-until-date
  time exit together, in one view, above the fold — never an entry without
  its exit plan attached (`BestPickHero.tsx`).
- Footer disclaimer on every page: "Personal analysis tool — not investment
  advice." No SEBI Investment Adviser framing, no advisor claims.

## Configuration

Everything in `app/config.py` is overridable via environment variables,
notably:

| Variable | Default | Meaning |
|---|---|---|
| `MAAG_CAPITAL_INR` | 100000 | Total trading capital |
| `MAAG_MAX_RISK_PCT` | 2.5 | Max risk per trade, % of capital |
| `MAAG_DEFAULT_SL_PCT` | 35 | Default stop-loss, % of entry premium |
| `MAAG_DEFAULT_TP_PCT` | 55 | Default profit target, % of max theoretical profit |
| `MAAG_HOLD_UNTIL` | 2026-09-05 | Fixed time-based exit date |
| `MAAG_BEST_PICK_MIN_SCORE` | 62 | Minimum composite score to name a Best Pick |
| `MAAG_SENTIMENT_MODEL` | lexicon | `lexicon` (built-in) or `finbert` (needs `transformers`+`torch`) |
| `NEWS_API_KEY`, `GNEWS_API_KEY`, `KITE_API_KEY`, ... | empty | Paid feed keys (see table above) |

## Running tests

```bash
cd market-at-a-glance/backend
source .venv/bin/activate
python -m pytest -q
```

## What's not built (by design, per the brief)

- No auto-execution / broker order placement — this is a recommendation
  report with a manual "I took this trade" log entry only.
- No SEBI Investment Adviser compliance flow — this is a solo-use personal
  tool, not a product offered to other people.
