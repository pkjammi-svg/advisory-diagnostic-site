"""Regression tests for the two bugs found while validating Stage 4 output:
1) max_loss_inr must scale with lot count the same way max_profit_inr does
   (never show a 1-lot max loss next to an N-lot max profit).
2) a candidate whose 1-lot max loss exceeds the max-risk-per-trade budget
   must be dropped (or replaced by an equity fallback), never surfaced with
   a misleading position_size_units=0 / ₹0 everything.
"""
from app.strategy.generator import CandidateStrategy, _size_options_candidate
from app.config import RISK


def test_size_options_candidate_scales_all_rupee_fields_consistently():
    lot = 25
    candidate = CandidateStrategy(
        instrument_symbol="TEST", instrument_name="Test", structure_type="bull_call_spread",
        entry_cost_inr=10 * lot, max_profit_inr=40 * lot, max_loss_inr=10 * lot,
        lot_or_share_size=lot,
    )
    sized = _size_options_candidate(candidate)
    assert sized is not None
    max_risk_amount = RISK.total_capital_inr * RISK.max_risk_per_trade_pct / 100
    expected_lots = int(max_risk_amount / (10 * lot))
    assert sized.position_size_units == expected_lots
    # max_loss and max_profit must scale by the *same* lot count.
    assert sized.max_loss_inr == round(10 * lot * expected_lots, 2)
    assert sized.max_profit_inr == round(40 * lot * expected_lots, 2)
    assert sized.capital_at_risk_inr == sized.max_loss_inr
    # Internal consistency: profit/loss ratio unchanged by scaling.
    assert abs((sized.max_profit_inr / sized.max_loss_inr) - 4.0) < 1e-6


def test_size_options_candidate_drops_when_unaffordable_at_one_lot():
    max_risk_amount = RISK.total_capital_inr * RISK.max_risk_per_trade_pct / 100
    candidate = CandidateStrategy(
        instrument_symbol="TEST", instrument_name="Test", structure_type="bull_call_spread",
        entry_cost_inr=max_risk_amount * 5, max_profit_inr=max_risk_amount * 20,
        max_loss_inr=max_risk_amount * 5,  # 1 lot alone already blows the budget
        lot_or_share_size=50,
    )
    assert _size_options_candidate(candidate) is None
