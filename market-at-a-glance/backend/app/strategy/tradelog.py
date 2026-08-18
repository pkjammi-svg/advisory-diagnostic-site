"""Stage 4.8 — Manual trade log + running performance stats.

No auto-execution: this only records "I took this trade" entries the user
enters manually, linked back to the StrategyPick that generated them.

Guardrail: there is no silent "clear history" — `export_and_clear()` always
writes a full backup snapshot (AuditExport) before it will touch existing
rows, and the API layer requires an explicit `confirm=True` to call it.
"""
from __future__ import annotations

import json
from datetime import datetime, date

from sqlalchemy.orm import Session

from app.models import TradeLogEntry, StrategyPick, AuditExport


def log_trade(session: Session, *, strategy_pick_id: int | None, trade_date: date,
              instrument_symbol: str, structure_type: str, entry_price: float | None,
              position_size_units: int | None, notes: str | None = None) -> TradeLogEntry:
    entry = TradeLogEntry(
        strategy_pick_id=strategy_pick_id, trade_date=trade_date, instrument_symbol=instrument_symbol,
        structure_type=structure_type, entry_price=entry_price, position_size_units=position_size_units,
        status="open", notes=notes,
    )
    session.add(entry)
    session.commit()
    return entry


def close_trade(session: Session, trade_id: int, *, exit_price: float, status: str,
                 pnl_inr: float | None = None, notes: str | None = None) -> TradeLogEntry:
    entry = session.query(TradeLogEntry).filter_by(id=trade_id).one()
    entry.exit_price = exit_price
    entry.status = status  # closed_target | closed_stop | closed_time | closed_invalidation | closed_manual
    entry.pnl_inr = pnl_inr
    entry.closed_at = datetime.utcnow()
    if notes:
        entry.notes = (entry.notes or "") + f"\n[close] {notes}"
    session.commit()
    return entry


def performance_stats(session: Session) -> dict:
    closed = session.query(TradeLogEntry).filter(TradeLogEntry.status.like("closed_%")).all()
    all_trades = session.query(TradeLogEntry).all()
    total_pnl = sum(t.pnl_inr or 0 for t in closed)
    wins = [t for t in closed if (t.pnl_inr or 0) > 0]
    losses = [t for t in closed if (t.pnl_inr or 0) <= 0]
    win_rate = round(100 * len(wins) / len(closed), 1) if closed else None
    avg_win = round(sum(t.pnl_inr for t in wins) / len(wins), 2) if wins else 0.0
    avg_loss = round(sum(t.pnl_inr for t in losses) / len(losses), 2) if losses else 0.0

    target_hits = len([t for t in closed if t.status == "closed_target"])
    stop_hits = len([t for t in closed if t.status == "closed_stop"])
    invalidation_hits = len([t for t in closed if t.status == "closed_invalidation"])
    time_hits = len([t for t in closed if t.status == "closed_time"])

    # Max drawdown on cumulative realised P&L sequence, ordered by close time.
    ordered = sorted([t for t in closed if t.closed_at], key=lambda t: t.closed_at)
    cum, peak, max_dd = 0.0, 0.0, 0.0
    for t in ordered:
        cum += t.pnl_inr or 0
        peak = max(peak, cum)
        max_dd = min(max_dd, cum - peak)

    return {
        "total_trades_logged": len(all_trades),
        "open_trades": len([t for t in all_trades if t.status == "open"]),
        "closed_trades": len(closed),
        "win_rate_pct": win_rate,
        "avg_win_inr": avg_win,
        "avg_loss_inr": avg_loss,
        "total_pnl_inr": round(total_pnl, 2),
        "max_drawdown_inr": round(max_dd, 2),
        "stop_loss_hit_rate_pct": round(100 * stop_hits / len(closed), 1) if closed else None,
        "target_hit_rate_pct": round(100 * target_hits / len(closed), 1) if closed else None,
        "invalidation_hit_rate_pct": round(100 * invalidation_hits / len(closed), 1) if closed else None,
        "time_exit_rate_pct": round(100 * time_hits / len(closed), 1) if closed else None,
    }


def export_snapshot(session: Session, reason: str) -> AuditExport:
    trades = session.query(TradeLogEntry).all()
    payload = [{
        "id": t.id, "trade_date": str(t.trade_date), "instrument_symbol": t.instrument_symbol,
        "structure_type": t.structure_type, "entry_price": t.entry_price, "exit_price": t.exit_price,
        "position_size_units": t.position_size_units, "status": t.status, "pnl_inr": t.pnl_inr,
        "notes": t.notes, "opened_at": str(t.opened_at), "closed_at": str(t.closed_at) if t.closed_at else None,
    } for t in trades]
    export = AuditExport(reason=reason, payload_json=json.dumps(payload))
    session.add(export)
    session.commit()
    return export


def export_and_clear(session: Session, *, confirm: bool) -> AuditExport:
    """Destructive reset of the trade log. Requires explicit confirm=True
    (enforced again at the API layer) and ALWAYS backs up first."""
    if not confirm:
        raise PermissionError("export_and_clear requires explicit confirm=True — no silent history reset.")
    export = export_snapshot(session, reason="pre_clear_backup")
    session.query(TradeLogEntry).delete()
    session.commit()
    return export
