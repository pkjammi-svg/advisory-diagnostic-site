"""Stage 4.1 — Market-wide opportunity scan / shortlist.

Screens every tracked index + F&O stock through a composite score (technical
alignment + non-neutral sentiment + liquidity) and returns the top N with a
one-line "why this made the cut" reason, so the filter is auditable rather
than a black box.
"""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models import Instrument, ComputedIndicator, SentimentSnapshot, OptionChainRow


@dataclass
class ScreenResult:
    instrument: Instrument
    technical: ComputedIndicator
    sentiment: SentimentSnapshot | None
    composite_score: float
    reason: str
    liquidity_ok: bool


def _liquidity_ok(session: Session, inst: Instrument) -> bool:
    if not inst.has_derivatives:
        return True  # equity-only instruments judged on price/volume, not OI
    total_oi = (session.query(OptionChainRow)
                .filter_by(instrument_id=inst.id).count())
    return total_oi > 0


def _technical_alignment_score(tech: ComputedIndicator) -> float:
    score = 0.0
    if tech.trend_direction in ("uptrend", "downtrend"):
        score += 40
    score += min(30, (tech.adx or 0))  # stronger ADX = stronger trend signal
    if tech.momentum_state in ("bullish", "bearish"):
        score += 30
    return min(100.0, score)


def run_screener(session: Session, instruments: list[Instrument],
                  shortlist_size: int = 15, min_score: float = 25.0) -> list[ScreenResult]:
    results: list[ScreenResult] = []
    for inst in instruments:
        tech = (session.query(ComputedIndicator).filter_by(instrument_id=inst.id)
                .order_by(ComputedIndicator.as_of.desc()).first())
        if tech is None:
            continue
        sent = (session.query(SentimentSnapshot).filter_by(instrument_id=inst.id)
                .order_by(SentimentSnapshot.as_of.desc()).first())

        tech_score = _technical_alignment_score(tech)
        sent_score = abs(sent.score) * 100 if sent else 0.0
        liquidity_ok = _liquidity_ok(session, inst)

        composite = 0.55 * tech_score + 0.30 * sent_score + (15.0 if liquidity_ok else 0.0)
        if not liquidity_ok:
            composite *= 0.5  # heavy penalty, don't fully exclude (still shows context)

        reasons = []
        if tech.trend_direction != "sideways":
            reasons.append(f"{tech.trend_direction} (ADX {tech.adx:.0f})")
        if tech.momentum_state != "neutral":
            reasons.append(f"{tech.momentum_state} momentum (RSI {tech.rsi14:.0f})")
        if sent and sent.label != "neutral":
            reasons.append(f"{sent.label} news sentiment ({sent.score:+.2f}, {sent.article_count} articles)")
        if sent and sent.consensus == "conflicting":
            reasons.append("conflicting headlines — narrative unresolved")
        if not liquidity_ok:
            reasons.append("thin/no option-chain liquidity — equity-only context")
        reason = "; ".join(reasons) if reasons else "no strong signal — included for context only"

        results.append(ScreenResult(
            instrument=inst, technical=tech, sentiment=sent,
            composite_score=round(composite, 1), reason=reason, liquidity_ok=liquidity_ok,
        ))

    results.sort(key=lambda r: r.composite_score, reverse=True)
    qualifying = [r for r in results if r.composite_score >= min_score]
    return (qualifying or results)[:shortlist_size]
