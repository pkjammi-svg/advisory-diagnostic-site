"""Stage 4.5/4.6 — Entry plan + exit plan for the Best Pick.

Every exit plan always ships all four required pieces together: profit
target, stop-loss (in both % and rupee terms), a time-based exit tied to
the user's hold-until date, and an invalidation trigger distinct from the
stop-loss. This module is the single place that assembles that bundle, so
no code path can show an entry without it.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

from app.config import RISK
from app.strategy.ranker import RankedCandidate


@dataclass
class EntryPlan:
    trigger_text: str
    price_low: float
    price_high: float


@dataclass
class ExitPlan:
    profit_target_text: str
    stop_loss_text: str
    stop_loss_pct: float
    stop_loss_inr: float
    time_exit_date: date
    time_exit_text: str
    invalidation_text: str


def build_entry_plan(ranked: RankedCandidate) -> EntryPlan:
    strat = ranked.strategy
    tech = ranked.screen.technical
    symbol = strat.instrument_symbol

    if strat.structure_type in ("bull_call_spread", "iron_condor") or strat.structure_type == "equity_long":
        level = tech.ema20
        trigger = (
            f"Enter if {symbol} spot holds above {level:,.0f} on a 15-minute closing basis "
            f"(confirms the {tech.trend_direction.replace('_', ' ')} is intact); if that condition is "
            f"already true at the time you read this, entering at current market price is acceptable."
        )
    elif strat.structure_type == "bear_put_spread" or strat.structure_type == "equity_short":
        level = tech.ema20
        trigger = (
            f"Enter if {symbol} spot holds below {level:,.0f} on a 15-minute closing basis "
            f"(confirms the {tech.trend_direction.replace('_', ' ')} is intact); if that condition is "
            f"already true at the time you read this, entering at current market price is acceptable."
        )
    else:
        trigger = f"Enter at current market price/premium; {symbol} is range-bound, so no breakout confirmation is required for this range-selling structure."

    cost_basis = strat.entry_cost_inr if strat.entry_cost_inr else strat.max_loss_inr or 0
    per_unit = cost_basis / max(strat.position_size_units, 1) if strat.position_size_units else cost_basis
    price_low = round(per_unit * 0.92, 2)
    price_high = round(per_unit * 1.08, 2)

    return EntryPlan(trigger_text=trigger, price_low=price_low, price_high=price_high)


def build_exit_plan(ranked: RankedCandidate) -> ExitPlan:
    strat = ranked.strategy
    tech = ranked.screen.technical

    # Profit target
    if strat.max_profit_inr:
        target_pct = RISK.default_profit_target_pct_of_max
        target_amount = round(strat.max_profit_inr * target_pct / 100, 2)
        profit_target_text = (
            f"Book profit once open gain reaches ~{target_pct:.0f}% of max profit "
            f"(~₹{target_amount:,.0f}), rather than holding out for the full theoretical max."
        )
    else:
        profit_target_text = (
            f"Book profit if {strat.instrument_symbol} reaches the next key level "
            f"({tech.r1:,.0f} for a long / {tech.s1:,.0f} for a short) or on a 6-8% favourable move, whichever comes first."
        )

    # Stop loss — always both % and ₹.
    sl_pct = RISK.default_stop_loss_pct
    basis = strat.entry_cost_inr or strat.max_loss_inr or 0
    sl_inr = round(basis * sl_pct / 100, 2) if strat.entry_cost_inr else (strat.max_loss_inr or 0)
    if strat.entry_cost_inr:
        stop_loss_text = (
            f"Exit if the position's value drops {sl_pct:.0f}% from entry premium "
            f"(≈ ₹{sl_inr:,.0f} loss), OR if {strat.instrument_symbol} breaks the technical "
            f"invalidation level below — whichever triggers first."
        )
    else:
        stop_loss_text = (
            f"Hard stop at the position's max defined loss of ₹{(strat.max_loss_inr or 0):,.0f} "
            f"({sl_pct:.0f}% is not applicable — this structure's loss is capped by design)."
        )

    # Time-based exit
    time_exit_date = datetime.strptime(RISK.hold_until_date, "%Y-%m-%d").date()
    time_exit_text = (
        f"Exit by {time_exit_date.isoformat()} regardless of P&L — this is the user's fixed "
        f"hold-till date, independent of the option's own expiry, so theta decay doesn't "
        f"silently erode an open position near that date."
    )

    # Invalidation trigger (distinct from stop-loss; checked daily)
    if strat.structure_type in ("bull_call_spread", "equity_long"):
        invalidation_text = (
            f"Thesis is invalidated if {strat.instrument_symbol} closes below {tech.s1:,.0f} "
            f"(pivot support) on a daily basis — exit regardless of where the stop-loss level sits."
        )
    elif strat.structure_type in ("bear_put_spread", "equity_short"):
        invalidation_text = (
            f"Thesis is invalidated if {strat.instrument_symbol} closes above {tech.r1:,.0f} "
            f"(pivot resistance) on a daily basis — exit regardless of where the stop-loss level sits."
        )
    else:
        invalidation_text = (
            f"Thesis is invalidated if {strat.instrument_symbol} closes outside the "
            f"{tech.s1:,.0f}-{tech.r1:,.0f} range on a daily basis (range breaks down) — "
            f"exit regardless of where the stop-loss level sits."
        )

    return ExitPlan(
        profit_target_text=profit_target_text, stop_loss_text=stop_loss_text,
        stop_loss_pct=sl_pct, stop_loss_inr=sl_inr, time_exit_date=time_exit_date,
        time_exit_text=time_exit_text, invalidation_text=invalidation_text,
    )
