"""Stage 4.3 — Per-instrument candidate strategy generation.

For has_derivatives=True instruments: builds an options structure (bull
call spread / bear put spread / iron condor) from the live option chain.
For has_derivatives=False instruments: builds an equity-based idea (sector
ETF proxy where one exists, else a "trade the shortlisted constituents"
note), since NSE doesn't list options/futures on most sectoral indices.

Every structure returned includes entry cost, max profit, max loss (always
in rupees), breakeven(s), and a rationale that cites the specific technical
+ sentiment signals it's based on — never just an assertion.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from sqlalchemy.orm import Session

from app.config import RISK, INDEX_LOT_SIZES, SECTOR_ETF_PROXY
from app.models import Instrument, ComputedIndicator, SentimentSnapshot, OptionChainRow
from app.strategy.screener import ScreenResult


@dataclass
class StrategyLeg:
    action: str      # buy | sell
    option_type: str  # CE | PE
    strike: float
    premium: float
    expiry: str


@dataclass
class CandidateStrategy:
    instrument_symbol: str
    instrument_name: str
    structure_type: str
    legs: list[StrategyLeg] = field(default_factory=list)
    entry_cost_inr: float | None = None
    max_profit_inr: float | None = None
    max_loss_inr: float | None = None
    breakevens: list[float] = field(default_factory=list)
    position_size_units: int = 0     # lots (options) or shares (equity)
    capital_at_risk_inr: float = 0.0
    lot_or_share_size: int = 1
    rationale: str = ""
    iv_avg: float | None = None
    spot: float = 0.0


def _lot_size(inst: Instrument, spot: float) -> int:
    if inst.symbol in INDEX_LOT_SIZES:
        return INDEX_LOT_SIZES[inst.symbol]
    if inst.kind == "stock":
        # Approximate lot size targeting ~1.5L contract value — NOT an NSE
        # official figure; verify against the live market-lot file.
        raw = max(1, round(150_000 / max(spot, 1)))
        return max(1, round(raw / 5) * 5) or 1
    return 1


def _nearest_expiry_chain(session: Session, inst: Instrument):
    rows = session.query(OptionChainRow).filter_by(instrument_id=inst.id).all()
    if not rows:
        return []
    nearest = min(r.expiry for r in rows)
    return [r for r in rows if r.expiry == nearest]


def _closest_row(rows: list[OptionChainRow], strike: float) -> OptionChainRow | None:
    if not rows:
        return None
    return min(rows, key=lambda r: abs(r.strike - strike))


def build_options_strategy(session: Session, inst: Instrument, tech: ComputedIndicator,
                            sent: SentimentSnapshot | None) -> CandidateStrategy | None:
    chain = _nearest_expiry_chain(session, inst)
    if not chain:
        return None
    spot = tech.close if hasattr(tech, "close") else None
    spot = spot or chain[0].underlying_spot
    lot = _lot_size(inst, spot)
    step = sorted({r.strike for r in chain})
    step_size = (step[1] - step[0]) if len(step) > 1 else max(1.0, spot * 0.01)

    sentiment_label = sent.label if sent else "neutral"
    bullish = tech.trend_direction == "uptrend" and tech.momentum_state != "bearish" and sentiment_label != "bearish"
    bearish = tech.trend_direction == "downtrend" and tech.momentum_state != "bullish" and sentiment_label != "bullish"
    avg_iv = sum(r.ce_iv for r in chain) / len(chain) if chain else 0.0

    rationale_bits = [tech.summary_text]
    if sent:
        rationale_bits.append(
            f"News sentiment is {sent.label} ({sent.score:+.2f} across {sent.article_count} articles, "
            f"{sent.consensus})."
        )

    if bullish:
        buy_strike = round(spot / step_size) * step_size
        sell_strike = tech.max_oi_call_strike or (buy_strike + 2 * step_size)
        buy_row = _closest_row(chain, buy_strike)
        sell_row = _closest_row(chain, sell_strike)
        if not buy_row or not sell_row or buy_row.strike >= sell_row.strike:
            return None
        debit = (buy_row.ce_ltp - sell_row.ce_ltp)
        if debit <= 0:
            return None
        width = sell_row.strike - buy_row.strike
        max_profit = (width - debit) * lot
        max_loss = debit * lot
        breakeven = buy_row.strike + debit
        rationale_bits.append(
            f"Bull call spread structured to profit if {inst.symbol} holds its uptrend toward the "
            f"{sell_row.strike:,.0f} max-Call-OI resistance level."
        )
        return CandidateStrategy(
            instrument_symbol=inst.symbol, instrument_name=inst.name, structure_type="bull_call_spread",
            legs=[
                StrategyLeg("buy", "CE", buy_row.strike, buy_row.ce_ltp, str(buy_row.expiry)),
                StrategyLeg("sell", "CE", sell_row.strike, sell_row.ce_ltp, str(sell_row.expiry)),
            ],
            entry_cost_inr=round(debit * lot, 2), max_profit_inr=round(max_profit, 2),
            max_loss_inr=round(max_loss, 2), breakevens=[round(breakeven, 2)],
            lot_or_share_size=lot, iv_avg=round(avg_iv, 2), spot=spot,
            rationale=" ".join(rationale_bits),
        )

    if bearish:
        buy_strike = round(spot / step_size) * step_size
        sell_strike = tech.max_oi_put_strike or (buy_strike - 2 * step_size)
        buy_row = _closest_row(chain, buy_strike)
        sell_row = _closest_row(chain, sell_strike)
        if not buy_row or not sell_row or buy_row.strike <= sell_row.strike:
            return None
        debit = (buy_row.pe_ltp - sell_row.pe_ltp)
        if debit <= 0:
            return None
        width = buy_row.strike - sell_row.strike
        max_profit = (width - debit) * lot
        max_loss = debit * lot
        breakeven = buy_row.strike - debit
        rationale_bits.append(
            f"Bear put spread structured to profit if {inst.symbol} continues down toward the "
            f"{sell_row.strike:,.0f} max-Put-OI support level."
        )
        return CandidateStrategy(
            instrument_symbol=inst.symbol, instrument_name=inst.name, structure_type="bear_put_spread",
            legs=[
                StrategyLeg("buy", "PE", buy_row.strike, buy_row.pe_ltp, str(buy_row.expiry)),
                StrategyLeg("sell", "PE", sell_row.strike, sell_row.pe_ltp, str(sell_row.expiry)),
            ],
            entry_cost_inr=round(debit * lot, 2), max_profit_inr=round(max_profit, 2),
            max_loss_inr=round(max_loss, 2), breakevens=[round(breakeven, 2)],
            lot_or_share_size=lot, iv_avg=round(avg_iv, 2), spot=spot,
            rationale=" ".join(rationale_bits),
        )

    # Range-bound / neutral -> iron condor (only worth selling premium when
    # IV is reasonably rich; otherwise skip rather than force a trade).
    if tech.trend_direction == "sideways" and avg_iv > 12:
        call_short = tech.max_oi_call_strike or (round(spot / step_size) * step_size + 2 * step_size)
        put_short = tech.max_oi_put_strike or (round(spot / step_size) * step_size - 2 * step_size)
        call_long = call_short + 2 * step_size
        put_long = put_short - 2 * step_size
        cs, cl = _closest_row(chain, call_short), _closest_row(chain, call_long)
        ps, pl = _closest_row(chain, put_short), _closest_row(chain, put_long)
        if not all([cs, cl, ps, pl]):
            return None
        credit = (cs.ce_ltp - cl.ce_ltp) + (ps.pe_ltp - pl.pe_ltp)
        if credit <= 0:
            return None
        call_wing = cl.strike - cs.strike
        put_wing = ps.strike - pl.strike
        max_loss = (max(call_wing, put_wing) - credit) * lot
        max_profit = credit * lot
        rationale_bits.append(
            f"Range-bound with ADX {tech.adx:.0f}; iron condor sells the "
            f"{put_short:,.0f}-{call_short:,.0f} range where OI is heaviest."
        )
        return CandidateStrategy(
            instrument_symbol=inst.symbol, instrument_name=inst.name, structure_type="iron_condor",
            legs=[
                StrategyLeg("sell", "CE", cs.strike, cs.ce_ltp, str(cs.expiry)),
                StrategyLeg("buy", "CE", cl.strike, cl.ce_ltp, str(cl.expiry)),
                StrategyLeg("sell", "PE", ps.strike, ps.pe_ltp, str(ps.expiry)),
                StrategyLeg("buy", "PE", pl.strike, pl.pe_ltp, str(pl.expiry)),
            ],
            entry_cost_inr=0.0, max_profit_inr=round(max_profit, 2), max_loss_inr=round(max_loss, 2),
            breakevens=[round(put_short - credit, 2), round(call_short + credit, 2)],
            lot_or_share_size=lot, iv_avg=round(avg_iv, 2), spot=spot,
            rationale=" ".join(rationale_bits),
        )

    return None


def build_equity_idea(session: Session, inst: Instrument, tech: ComputedIndicator,
                       sent: SentimentSnapshot | None) -> CandidateStrategy | None:
    """For has_derivatives=False instruments (sectoral indices w/o listed
    options, or as a fallback), or when no clean options structure fits."""
    if tech.trend_direction == "sideways":
        return None  # no directional equity idea without a trend to lean on

    sentiment_label = sent.label if sent else "neutral"
    direction = "long" if tech.trend_direction == "uptrend" else "short"
    if direction == "long" and sentiment_label == "bearish":
        return None
    if direction == "short" and sentiment_label == "bullish":
        return None

    spot = tech.close
    proxy = SECTOR_ETF_PROXY.get(inst.symbol)
    stop_distance = tech.atr * 1.5 if tech.atr else spot * 0.02
    capital_allocation = RISK.total_capital_inr * 0.15  # 15% of capital as an equity idea slot, configurable
    shares = max(1, int(capital_allocation / spot))
    capital_required = round(shares * spot, 2)
    max_loss = round(shares * stop_distance, 2)

    vehicle = proxy or f"top-ranked {inst.sector or inst.name} F&O constituents from today's shortlist"
    rationale = (
        f"{tech.summary_text} Sentiment is {sentiment_label}"
        + (f" ({sent.score:+.2f}, {sent.article_count} articles)." if sent else ".")
        + f" No listed NSE derivatives on {inst.name}, so this is an equity/ETF idea via {vehicle}, "
          f"sized with an ATR-based stop rather than an options-defined max loss."
    )

    return CandidateStrategy(
        instrument_symbol=inst.symbol, instrument_name=inst.name,
        structure_type=f"equity_{direction}",
        legs=[],
        entry_cost_inr=capital_required, max_profit_inr=None, max_loss_inr=max_loss,
        breakevens=[], position_size_units=shares, capital_at_risk_inr=max_loss,
        lot_or_share_size=1, iv_avg=None, spot=spot, rationale=rationale,
    )


def _size_options_candidate(candidate: CandidateStrategy) -> CandidateStrategy | None:
    """Sizes an options structure (still holding per-1-lot totals) to fit
    the max-risk-per-trade budget. Returns None if even 1 lot's max loss
    exceeds the budget, rather than surfacing a misleading ₹0 position."""
    if not candidate.max_loss_inr:
        return candidate
    max_risk_amount = RISK.total_capital_inr * RISK.max_risk_per_trade_pct / 100
    per_lot_max_loss = candidate.max_loss_inr
    lots = int(max_risk_amount / max(per_lot_max_loss, 1))
    if lots < 1:
        return None
    candidate.position_size_units = lots
    # Scale every rupee figure by the same lot count so max loss, max
    # profit, entry cost and capital-at-risk all stay internally consistent
    # (never show a 1-lot max loss next to an N-lot max profit).
    candidate.max_loss_inr = round(per_lot_max_loss * lots, 2)
    candidate.capital_at_risk_inr = candidate.max_loss_inr
    if candidate.entry_cost_inr:
        candidate.entry_cost_inr = round(candidate.entry_cost_inr * lots, 2)
    if candidate.max_profit_inr:
        candidate.max_profit_inr = round(candidate.max_profit_inr * lots, 2)
    return candidate


def generate_candidate(session: Session, screen: ScreenResult) -> CandidateStrategy | None:
    inst, tech, sent = screen.instrument, screen.technical, screen.sentiment
    candidate = None
    if inst.has_derivatives:
        raw = build_options_strategy(session, inst, tech, sent)
        if raw is not None:
            candidate = _size_options_candidate(raw)
    if candidate is None:
        # Either no derivatives, no clean options structure, or the options
        # structure didn't fit the risk budget even at 1 lot — fall back to
        # an equity/ETF idea rather than surfacing nothing.
        candidate = build_equity_idea(session, inst, tech, sent)

    return candidate
