"""FastAPI routers for Market at a Glance."""
from __future__ import annotations

import json
from datetime import date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import RISK, DISCLAIMER
from app.db import get_session
from app.models import Instrument, StrategyPick, NewsArticle, ComputedIndicator, SentimentSnapshot, TradeLogEntry
from app.api.serializers import (
    instrument_to_dict, technical_to_dict, sentiment_to_dict, strategy_pick_to_dict, trade_log_entry_to_dict,
)
from app.strategy.regime import broad_market_regime, sector_regimes
from app.strategy.portfolio import build_portfolio_view_from_dicts
from app.strategy.tradelog import log_trade, close_trade, performance_stats, export_and_clear, export_snapshot
from app.strategy.daily_report import run_daily_strategy_pipeline

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/meta")
def meta():
    return {
        "app_name": "Market at a Glance",
        "disclaimer": DISCLAIMER,
        "capital_inr": RISK.total_capital_inr,
        "max_risk_per_trade_pct": RISK.max_risk_per_trade_pct,
        "hold_until_date": RISK.hold_until_date,
        "monthly_target_pct": [RISK.monthly_return_target_low_pct, RISK.monthly_return_target_high_pct],
    }


def _recent_headlines(session: Session, instrument_id: int, limit: int = 5) -> list[dict]:
    arts = (session.query(NewsArticle).filter_by(instrument_id=instrument_id)
            .order_by(NewsArticle.published_at.desc()).limit(limit).all())
    return [{"headline": a.headline, "url": a.url, "source": a.source,
             "score": a.sentiment_score, "published_at": a.published_at.isoformat()} for a in arts]


@router.get("/dashboard")
def dashboard():
    with get_session() as session:
        today = date.today()
        picks = (session.query(StrategyPick).filter_by(trade_date=today)
                 .order_by(StrategyPick.rank.asc()).all())
        if not picks:
            # fall back to the most recent trade_date with data, so the
            # dashboard isn't empty just because the pipeline hasn't been
            # re-run yet today.
            latest_date = (session.query(StrategyPick.trade_date)
                           .order_by(StrategyPick.trade_date.desc()).limit(1).scalar())
            if latest_date:
                picks = (session.query(StrategyPick).filter_by(trade_date=latest_date)
                         .order_by(StrategyPick.rank.asc()).all())

        best_pick = next((p for p in picks if p.is_best_pick), None)
        runner_ups = [p for p in picks if not p.is_best_pick][:2]

        shortlist_cards = []
        for p in picks:
            inst = session.query(Instrument).filter_by(id=p.instrument_id).one()
            tech = (session.query(ComputedIndicator).filter_by(instrument_id=inst.id)
                    .order_by(ComputedIndicator.as_of.desc()).first())
            sent = (session.query(SentimentSnapshot).filter_by(instrument_id=inst.id)
                    .order_by(SentimentSnapshot.as_of.desc()).first())
            card = strategy_pick_to_dict(p, inst)
            card["technical"] = technical_to_dict(tech)
            card["sentiment"] = sentiment_to_dict(sent, _recent_headlines(session, inst.id))
            shortlist_cards.append(card)

        broad = broad_market_regime(session)
        sectors = sector_regimes(session)
        portfolio = build_portfolio_view_from_dicts([
            {"symbol": c["instrument"]["symbol"], "structure_type": c["structure_type"],
             "capital_at_risk_inr": c["capital_at_risk_inr"]}
            for c in shortlist_cards
        ])

        return {
            "trade_date": today.isoformat(),
            "meta": {
                "app_name": "Market at a Glance",
                "disclaimer": DISCLAIMER,
                "capital_inr": RISK.total_capital_inr,
                "max_risk_per_trade_pct": RISK.max_risk_per_trade_pct,
                "hold_until_date": RISK.hold_until_date,
            },
            "broad_market_regime": {
                "label": broad.label, "regime": broad.regime,
                "detail": broad.detail, "uncertainty": broad.uncertainty,
            },
            "sector_regimes": [
                {"label": s.label, "regime": s.regime, "uncertainty": s.uncertainty} for s in sectors
            ],
            "best_pick": (next((c for c in shortlist_cards if c["is_best_pick"]), None)),
            "no_trade_today": best_pick is None,
            "runner_ups": [c for c in shortlist_cards if not c["is_best_pick"]][:2],
            "shortlist": shortlist_cards,
            "portfolio": {
                "total_capital_at_risk_inr": portfolio.total_capital_at_risk_inr,
                "pct_of_capital": portfolio.pct_of_capital,
                "candidate_count": portfolio.candidate_count,
                "correlation_warnings": portfolio.correlation_warnings,
            },
        }


@router.get("/instruments/{symbol}")
def instrument_detail(symbol: str):
    with get_session() as session:
        inst = session.query(Instrument).filter_by(symbol=symbol.upper()).one_or_none()
        if inst is None:
            raise HTTPException(404, f"Unknown instrument {symbol}")
        tech = (session.query(ComputedIndicator).filter_by(instrument_id=inst.id)
                .order_by(ComputedIndicator.as_of.desc()).first())
        sent = (session.query(SentimentSnapshot).filter_by(instrument_id=inst.id)
                .order_by(SentimentSnapshot.as_of.desc()).first())
        latest_pick = (session.query(StrategyPick).filter_by(instrument_id=inst.id)
                       .order_by(StrategyPick.trade_date.desc()).first())
        return {
            "instrument": instrument_to_dict(inst),
            "technical": technical_to_dict(tech),
            "sentiment": sentiment_to_dict(sent, _recent_headlines(session, inst.id)),
            "latest_strategy": strategy_pick_to_dict(latest_pick, inst) if latest_pick else None,
        }


@router.post("/pipeline/run")
def trigger_pipeline_run():
    """Re-runs Stage 4 strategy generation against whatever price/options/news
    data is currently stored (does not re-fetch data — use scripts/run_full_pipeline.py
    or the scheduler for a full data refresh)."""
    with get_session() as session:
        report = run_daily_strategy_pipeline(session)
        return {
            "trade_date": report["trade_date"],
            "shortlist_count": report["shortlist_count"],
            "candidate_count": report["candidate_count"],
            "no_trade_today": report["no_trade_today"],
        }


# --------------------------------------------------------------------------
# Trade log
# --------------------------------------------------------------------------
class LogTradeRequest(BaseModel):
    strategy_pick_id: int | None = None
    instrument_symbol: str
    structure_type: str
    entry_price: float | None = None
    position_size_units: int | None = None
    notes: str | None = None


class CloseTradeRequest(BaseModel):
    exit_price: float
    status: str  # closed_target | closed_stop | closed_time | closed_invalidation | closed_manual
    pnl_inr: float | None = None
    notes: str | None = None


class ClearRequest(BaseModel):
    confirm: bool = False


@router.get("/tradelog")
def get_trade_log():
    with get_session() as session:
        trades = session.query(TradeLogEntry).order_by(TradeLogEntry.trade_date.desc()).all()
        return {
            "trades": [trade_log_entry_to_dict(t) for t in trades],
            "stats": performance_stats(session),
        }


@router.post("/tradelog")
def post_trade_log(req: LogTradeRequest):
    with get_session() as session:
        entry = log_trade(
            session, strategy_pick_id=req.strategy_pick_id, trade_date=date.today(),
            instrument_symbol=req.instrument_symbol.upper(), structure_type=req.structure_type,
            entry_price=req.entry_price, position_size_units=req.position_size_units, notes=req.notes,
        )
        return trade_log_entry_to_dict(entry)


@router.post("/tradelog/{trade_id}/close")
def post_close_trade(trade_id: int, req: CloseTradeRequest):
    valid_statuses = {"closed_target", "closed_stop", "closed_time", "closed_invalidation", "closed_manual"}
    if req.status not in valid_statuses:
        raise HTTPException(400, f"status must be one of {sorted(valid_statuses)}")
    with get_session() as session:
        try:
            entry = close_trade(session, trade_id, exit_price=req.exit_price, status=req.status,
                                 pnl_inr=req.pnl_inr, notes=req.notes)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(404, str(exc))
        return trade_log_entry_to_dict(entry)


@router.get("/tradelog/export")
def get_trade_log_export():
    """Download a full backup snapshot without touching any data — always
    available, independent of the guarded clear action below."""
    with get_session() as session:
        export = export_snapshot(session, reason="manual_export")
        return {"exported_at": export.created_at.isoformat(), "payload": json.loads(export.payload_json)}


@router.post("/tradelog/clear")
def post_clear_trade_log(req: ClearRequest):
    """Guardrail: never silently resets history. Requires confirm=true, and
    always writes a full backup (AuditExport) before deleting anything —
    fetch /tradelog/export first if you want a copy in hand."""
    if not req.confirm:
        raise HTTPException(400, "Refusing to clear trade log without confirm=true. "
                                  "Call GET /tradelog/export first to back up, then resend with confirm=true.")
    with get_session() as session:
        export = export_and_clear(session, confirm=True)
        return {"cleared": True, "backup_id": export.id, "backup_created_at": export.created_at.isoformat()}
