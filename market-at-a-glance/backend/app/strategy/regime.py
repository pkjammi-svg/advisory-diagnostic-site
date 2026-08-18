"""Stage 4.2 — Market regime read: broad-market (Nifty 50) + per-sector."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.config import SECTORAL_INDICES
from app.models import Instrument, ComputedIndicator, SentimentSnapshot


@dataclass
class RegimeRead:
    scope: str            # "broad_market" | sector symbol
    label: str             # display name
    regime: str            # trending_up | trending_down | range_bound | high_uncertainty
    detail: str
    uncertainty: bool


def _classify(tech: ComputedIndicator, sent: SentimentSnapshot | None) -> tuple[str, bool]:
    if tech is None:
        return "unknown", True

    high_uncertainty = False
    if sent and sent.consensus == "conflicting" and (tech.adx or 0) < 20:
        high_uncertainty = True
    if tech.hist_vol and tech.hist_vol > 22:  # elevated annualised vol
        high_uncertainty = True

    if tech.trend_direction == "uptrend" and (tech.adx or 0) >= 20:
        regime = "trending_up"
    elif tech.trend_direction == "downtrend" and (tech.adx or 0) >= 20:
        regime = "trending_down"
    else:
        regime = "range_bound"

    if high_uncertainty:
        regime = "high_uncertainty"
    return regime, high_uncertainty


def broad_market_regime(session: Session) -> RegimeRead:
    inst = session.query(Instrument).filter_by(symbol="NIFTY50").one_or_none()
    if inst is None:
        return RegimeRead("broad_market", "Nifty 50", "unknown", "No Nifty 50 data yet.", True)
    tech = (session.query(ComputedIndicator).filter_by(instrument_id=inst.id)
            .order_by(ComputedIndicator.as_of.desc()).first())
    sent = (session.query(SentimentSnapshot).filter_by(instrument_id=inst.id)
            .order_by(SentimentSnapshot.as_of.desc()).first())
    regime, uncertain = _classify(tech, sent)
    detail = tech.summary_text if tech else "Insufficient data."
    return RegimeRead("broad_market", "Nifty 50 (broad market)", regime, detail, uncertain)


def sector_regimes(session: Session) -> list[RegimeRead]:
    out = []
    for idx in SECTORAL_INDICES:
        inst = session.query(Instrument).filter_by(symbol=idx.symbol).one_or_none()
        if inst is None:
            continue
        tech = (session.query(ComputedIndicator).filter_by(instrument_id=inst.id)
                .order_by(ComputedIndicator.as_of.desc()).first())
        if tech is None:
            continue
        sent = (session.query(SentimentSnapshot).filter_by(instrument_id=inst.id)
                .order_by(SentimentSnapshot.as_of.desc()).first())
        regime, uncertain = _classify(tech, sent)
        short = f"{idx.name} is {regime.replace('_', ' ')}"
        out.append(RegimeRead(idx.symbol, idx.name, regime, short, uncertain))
    return out
