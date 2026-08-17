"""Stage 4.4 — Ranks candidate strategies and selects the single Best Pick.

Weighs: strength/agreement of technical+sentiment signals, risk-reward
ratio, distance of current price from key support/resistance, and current
IV level (penalising expensive premium buys when IV is elevated — the same
"don't buy rich premium" logic used manually on the crude chain).

Shows the score breakdown for the top 3 candidates so the choice is
auditable, not a black box, and never returns a pick below
RISK.best_pick_min_score — on a weak day it says so explicitly instead of
forcing a trade (guardrail: no picks below the bar).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.config import RISK
from app.strategy.screener import ScreenResult
from app.strategy.generator import CandidateStrategy


@dataclass
class RankedCandidate:
    screen: ScreenResult
    strategy: CandidateStrategy
    total_score: float
    breakdown: dict = field(default_factory=dict)


def _risk_reward_score(strategy: CandidateStrategy) -> float:
    if not strategy.max_loss_inr or strategy.max_loss_inr <= 0:
        return 50.0
    if strategy.max_profit_inr:
        rr = strategy.max_profit_inr / strategy.max_loss_inr
        return max(0.0, min(100.0, rr * 40))  # rr of 2.5 -> 100
    return 50.0  # equity ideas without a hard profit target: neutral score


def _sr_distance_score(screen: ScreenResult) -> float:
    tech = screen.technical
    close = tech.close or 0
    if not close:
        return 50.0
    nearest_r = min([x for x in (tech.r1, tech.max_oi_call_strike) if x], default=None)
    nearest_s = max([x for x in (tech.s1, tech.max_oi_put_strike) if x], default=None)
    if nearest_r is None or nearest_s is None or nearest_r == nearest_s:
        return 50.0
    band = nearest_r - nearest_s
    if band <= 0:
        return 50.0
    # Favor price sitting closer to one edge of the S/R band (a cleaner
    # breakout/bounce setup) over sitting dead in the middle (ambiguous).
    pos = (close - nearest_s) / band
    distance_from_mid = abs(pos - 0.5) * 2  # 0 at mid, 1 at either edge
    return round(distance_from_mid * 100, 1)


def _iv_fit_score(strategy: CandidateStrategy) -> float:
    """Net-debit structures (bull call / bear put spread) want LOW IV;
    net-credit structures (iron condor) want HIGH IV. Equity ideas are
    IV-agnostic (score neutral)."""
    if strategy.iv_avg is None:
        return 50.0
    if strategy.structure_type in ("bull_call_spread", "bear_put_spread"):
        return max(0.0, min(100.0, 100 - (strategy.iv_avg - 10) * 4))  # cheaper IV -> higher score
    if strategy.structure_type == "iron_condor":
        return max(0.0, min(100.0, (strategy.iv_avg - 10) * 5))  # richer IV -> higher score
    return 50.0


def score_candidate(screen: ScreenResult, strategy: CandidateStrategy) -> RankedCandidate:
    technical_sentiment_score = screen.composite_score  # already blends technical + sentiment
    rr_score = _risk_reward_score(strategy)
    sr_score = _sr_distance_score(screen)
    iv_score = _iv_fit_score(strategy)

    weights = {"technical_sentiment": 0.35, "risk_reward": 0.25, "sr_distance": 0.20, "iv_fit": 0.20}
    total = (
        weights["technical_sentiment"] * technical_sentiment_score
        + weights["risk_reward"] * rr_score
        + weights["sr_distance"] * sr_score
        + weights["iv_fit"] * iv_score
    )
    breakdown = {
        "technical_sentiment": round(technical_sentiment_score, 1),
        "risk_reward": round(rr_score, 1),
        "sr_distance": round(sr_score, 1),
        "iv_fit": round(iv_score, 1),
        "weights": weights,
    }
    return RankedCandidate(screen=screen, strategy=strategy, total_score=round(total, 1), breakdown=breakdown)


def rank_candidates(pairs: list[tuple[ScreenResult, CandidateStrategy]]) -> list[RankedCandidate]:
    ranked = [score_candidate(s, c) for s, c in pairs if c is not None]
    ranked.sort(key=lambda r: r.total_score, reverse=True)
    return ranked


def select_best_pick(ranked: list[RankedCandidate], broad_regime_uncertain: bool) -> RankedCandidate | None:
    if not ranked:
        return None
    top = ranked[0]
    min_score = RISK.best_pick_min_score
    if broad_regime_uncertain:
        # Guardrail: high-uncertainty regime raises the bar rather than
        # biasing toward a "make up for it" aggressive pick.
        min_score += 8
    if top.total_score < min_score:
        return None
    return top
