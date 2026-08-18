"""Stage 4.7 — Portfolio-level view: total capital at risk across today's
candidates, and a correlation flag so the same macro bet isn't 3x'd
unknowingly (e.g. Nifty + Bank Nifty both long on the same thesis)."""
from __future__ import annotations

from dataclasses import dataclass, field

from app.config import RISK
from app.strategy.ranker import RankedCandidate

# Simple correlation groups — instruments that tend to move together on the
# same macro driver. A production version would compute rolling return
# correlation from price history; this label-based grouping is a
# transparent v1 approximation.
CORRELATION_GROUPS = {
    "nifty_banking_complex": {"NIFTY50", "BANKNIFTY", "FINNIFTY", "NIFTYPVTBANK", "NIFTYPSUBANK", "NIFTYNEXT50"},
    "rate_sensitive": {"BANKNIFTY", "FINNIFTY", "NIFTYREALTY", "NIFTYPVTBANK"},
    "global_cyclicals": {"NIFTYMETAL", "NIFTYENERGY", "NIFTYIT"},
}


@dataclass
class PortfolioView:
    total_capital_at_risk_inr: float
    pct_of_capital: float
    candidate_count: int
    correlation_warnings: list[str] = field(default_factory=list)


def build_portfolio_view(ranked: list[RankedCandidate]) -> PortfolioView:
    total_risk = sum(r.strategy.capital_at_risk_inr or 0 for r in ranked)
    same_direction_by_group: dict[str, dict[str, list[str]]] = {}

    for r in ranked:
        direction = "long" if r.strategy.structure_type in ("bull_call_spread", "equity_long") else (
            "short" if r.strategy.structure_type in ("bear_put_spread", "equity_short") else "neutral")
        if direction == "neutral":
            continue
        for group, members in CORRELATION_GROUPS.items():
            if r.strategy.instrument_symbol in members:
                same_direction_by_group.setdefault(group, {}).setdefault(direction, []).append(r.strategy.instrument_symbol)

    warnings = []
    for group, dirs in same_direction_by_group.items():
        for direction, symbols in dirs.items():
            if len(set(symbols)) > 1:
                warnings.append(
                    f"{', '.join(sorted(set(symbols)))} are all {direction} candidates in the same "
                    f"'{group.replace('_', ' ')}' correlation group — taking more than one multiplies "
                    f"exposure to the same underlying macro bet rather than diversifying it."
                )

    return PortfolioView(
        total_capital_at_risk_inr=round(total_risk, 2),
        pct_of_capital=round(100 * total_risk / RISK.total_capital_inr, 2) if RISK.total_capital_inr else 0.0,
        candidate_count=len(ranked),
        correlation_warnings=warnings,
    )


def build_portfolio_view_from_dicts(picks: list[dict]) -> PortfolioView:
    """Same as build_portfolio_view but works from serialized dashboard
    cards (dicts with symbol/structure_type/capital_at_risk_inr) as read
    back from the DB by the API layer, instead of live RankedCandidate
    objects from a just-run pipeline."""
    total_risk = sum(p.get("capital_at_risk_inr") or 0 for p in picks)
    same_direction_by_group: dict[str, dict[str, list[str]]] = {}

    for p in picks:
        structure_type = p.get("structure_type")
        direction = "long" if structure_type in ("bull_call_spread", "equity_long") else (
            "short" if structure_type in ("bear_put_spread", "equity_short") else "neutral")
        if direction == "neutral":
            continue
        symbol = p.get("symbol")
        if not symbol:
            continue
        for group, members in CORRELATION_GROUPS.items():
            if symbol in members:
                same_direction_by_group.setdefault(group, {}).setdefault(direction, []).append(symbol)

    warnings = []
    for group, dirs in same_direction_by_group.items():
        for direction, symbols in dirs.items():
            if len(set(symbols)) > 1:
                warnings.append(
                    f"{', '.join(sorted(set(symbols)))} are all {direction} candidates in the same "
                    f"'{group.replace('_', ' ')}' correlation group — taking more than one multiplies "
                    f"exposure to the same underlying macro bet rather than diversifying it."
                )

    return PortfolioView(
        total_capital_at_risk_inr=round(total_risk, 2),
        pct_of_capital=round(100 * total_risk / RISK.total_capital_inr, 2) if RISK.total_capital_inr else 0.0,
        candidate_count=len(picks),
        correlation_warnings=warnings,
    )
