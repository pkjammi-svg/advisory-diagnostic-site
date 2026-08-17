"""Stage 4 orchestrator — runs the full daily strategy generation pipeline
and persists StrategyPick rows (shortlist + best pick) for the dashboard."""
from __future__ import annotations

import json
from datetime import date

from sqlalchemy.orm import Session

from app.models import Instrument, StrategyPick
from app.strategy.screener import run_screener
from app.strategy.regime import broad_market_regime, sector_regimes
from app.strategy.generator import generate_candidate
from app.strategy.ranker import rank_candidates, select_best_pick
from app.strategy.entry_exit import build_entry_plan, build_exit_plan
from app.strategy.portfolio import build_portfolio_view


def run_daily_strategy_pipeline(session: Session) -> dict:
    today = date.today()

    # Clear any existing picks for today so re-runs don't duplicate rows.
    session.query(StrategyPick).filter_by(trade_date=today).delete()
    session.commit()

    instruments = session.query(Instrument).filter_by(is_active=True).all()
    shortlist = run_screener(session, instruments)

    broad_regime = broad_market_regime(session)
    sec_regimes = sector_regimes(session)

    pairs = []
    for screen in shortlist:
        candidate = generate_candidate(session, screen)
        if candidate:
            pairs.append((screen, candidate))

    ranked = rank_candidates(pairs)
    best = select_best_pick(ranked, broad_regime.uncertainty)
    portfolio = build_portfolio_view(ranked)

    saved_picks = []
    for i, r in enumerate(ranked):
        is_best = best is not None and r is best
        entry_plan = exit_plan = None
        if is_best:
            entry_plan = build_entry_plan(r)
            exit_plan = build_exit_plan(r)

        pick = StrategyPick(
            trade_date=today, instrument_id=r.screen.instrument.id, is_best_pick=is_best,
            rank=i + 1, score=r.total_score, score_breakdown_json=json.dumps(r.breakdown),
            structure_type=r.strategy.structure_type,
            structure_json=json.dumps([leg.__dict__ for leg in r.strategy.legs]),
            entry_cost_inr=r.strategy.entry_cost_inr, max_profit_inr=r.strategy.max_profit_inr,
            max_loss_inr=r.strategy.max_loss_inr, breakeven_json=json.dumps(r.strategy.breakevens),
            position_size_units=r.strategy.position_size_units,
            capital_at_risk_inr=r.strategy.capital_at_risk_inr,
            rationale_text=r.strategy.rationale, why_shortlisted_text=r.screen.reason,
            entry_trigger_text=entry_plan.trigger_text if entry_plan else None,
            entry_price_low=entry_plan.price_low if entry_plan else None,
            entry_price_high=entry_plan.price_high if entry_plan else None,
            profit_target_text=exit_plan.profit_target_text if exit_plan else None,
            stop_loss_text=exit_plan.stop_loss_text if exit_plan else None,
            stop_loss_pct=exit_plan.stop_loss_pct if exit_plan else None,
            stop_loss_inr=exit_plan.stop_loss_inr if exit_plan else None,
            time_exit_date=exit_plan.time_exit_date if exit_plan else None,
            invalidation_text=exit_plan.invalidation_text if exit_plan else None,
        )
        session.add(pick)
        saved_picks.append(pick)
    session.commit()

    return {
        "trade_date": str(today),
        "broad_regime": broad_regime,
        "sector_regimes": sec_regimes,
        "shortlist_count": len(shortlist),
        "candidate_count": len(ranked),
        "best_pick_id": best and next(p.id for p in saved_picks if p.is_best_pick),
        "no_trade_today": best is None,
        "portfolio": portfolio,
    }
