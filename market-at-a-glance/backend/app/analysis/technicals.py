"""Stage 2 — Technical analysis engine.

Computes, for a given instrument's daily OHLCV history: trend (EMA20/50/200,
ADX), momentum (RSI14, MACD, Stochastic), volatility (ATR, Bollinger Bands,
historical volatility), support/resistance (pivots, swing highs/lows, and —
for derivative instruments — max-OI based S/R read from the option chain),
and volume (vs 20-day average, OBV).

Everything here uses plain pandas/numpy (no ta-lib dependency, which needs a
compiled C library) so it installs cleanly anywhere.

Output: a `TechnicalRead` dataclass — the "structured technical read object"
the brief asks for, including a plain-English one-paragraph summary.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict

import numpy as np
import pandas as pd


@dataclass
class TechnicalRead:
    symbol: str
    as_of: str
    close: float
    ema20: float; ema50: float; ema200: float
    adx: float
    rsi14: float
    macd: float; macd_signal: float; macd_hist: float
    stoch_k: float; stoch_d: float
    atr: float
    bb_upper: float; bb_mid: float; bb_lower: float
    hist_vol: float
    pivot: float; r1: float; r2: float; s1: float; s2: float
    swing_high: float; swing_low: float
    volume_vs_avg20: float
    obv: float
    trend_direction: str
    momentum_state: str
    max_oi_call_strike: float | None = None
    max_oi_put_strike: float | None = None
    summary_text: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


def _ema(series: pd.Series, span: int) -> pd.Series:
    return series.ewm(span=span, adjust=False).mean()


def _rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50)


def _macd(close: pd.Series, fast=12, slow=26, signal=9):
    macd_line = _ema(close, fast) - _ema(close, slow)
    signal_line = _ema(macd_line, signal)
    hist = macd_line - signal_line
    return macd_line, signal_line, hist


def _atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    high, low, close = df["high"], df["low"], df["close"]
    prev_close = close.shift(1)
    tr = pd.concat([
        high - low, (high - prev_close).abs(), (low - prev_close).abs(),
    ], axis=1).max(axis=1)
    return tr.ewm(alpha=1 / period, adjust=False).mean()


def _adx(df: pd.DataFrame, period: int = 14) -> pd.Series:
    high, low, close = df["high"], df["low"], df["close"]
    up_move = high.diff()
    down_move = -low.diff()
    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)
    atr = _atr(df, period).replace(0, np.nan)
    plus_di = 100 * pd.Series(plus_dm, index=df.index).ewm(alpha=1 / period, adjust=False).mean() / atr
    minus_di = 100 * pd.Series(minus_dm, index=df.index).ewm(alpha=1 / period, adjust=False).mean() / atr
    dx = (100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)).fillna(0)
    return dx.ewm(alpha=1 / period, adjust=False).mean().fillna(0)


def _stochastic(df: pd.DataFrame, k_period=14, d_period=3):
    low_min = df["low"].rolling(k_period).min()
    high_max = df["high"].rolling(k_period).max()
    k = 100 * (df["close"] - low_min) / (high_max - low_min).replace(0, np.nan)
    k = k.fillna(50)
    d = k.rolling(d_period).mean().fillna(50)
    return k, d


def _bollinger(close: pd.Series, period=20, num_std=2):
    mid = close.rolling(period).mean()
    std = close.rolling(period).std()
    return mid + num_std * std, mid, mid - num_std * std


def _pivots(df: pd.DataFrame):
    last = df.iloc[-1]
    pivot = (last["high"] + last["low"] + last["close"]) / 3
    r1 = 2 * pivot - last["low"]
    s1 = 2 * pivot - last["high"]
    r2 = pivot + (last["high"] - last["low"])
    s2 = pivot - (last["high"] - last["low"])
    return pivot, r1, r2, s1, s2


def _obv(df: pd.DataFrame) -> pd.Series:
    direction = np.sign(df["close"].diff().fillna(0))
    return (direction * df["volume"]).cumsum()


def compute_technicals(symbol: str, df: pd.DataFrame,
                        max_oi_call_strike: float | None = None,
                        max_oi_put_strike: float | None = None) -> TechnicalRead:
    """`df` must have columns ts, open, high, low, close, volume, sorted ascending."""
    df = df.sort_values("ts").reset_index(drop=True)
    if 0 < len(df) < 30:
        # Pad by repeating the first row so rolling windows don't all come
        # back NaN on very short histories (keeps the demo usable on day 1).
        pad_count = 30 - len(df)
        padding = pd.concat([df.iloc[[0]]] * pad_count, ignore_index=True)
        df = pd.concat([padding, df], ignore_index=True)

    close = df["close"]
    ema20, ema50, ema200 = _ema(close, 20), _ema(close, 50), _ema(close, 200)
    adx = _adx(df)
    rsi14 = _rsi(close)
    macd_line, macd_signal, macd_hist = _macd(close)
    stoch_k, stoch_d = _stochastic(df)
    atr = _atr(df)
    bb_u, bb_m, bb_l = _bollinger(close)
    log_ret = np.log(close / close.shift(1))
    hist_vol = float(log_ret.rolling(20).std().iloc[-1] * np.sqrt(252) * 100) if len(df) > 21 else 0.0
    pivot, r1, r2, s1, s2 = _pivots(df)
    swing_high = float(df["high"].tail(20).max())
    swing_low = float(df["low"].tail(20).min())
    vol_avg20 = df["volume"].rolling(20).mean().iloc[-1]
    vol_vs_avg = float(df["volume"].iloc[-1] / vol_avg20) if vol_avg20 else 1.0
    obv = float(_obv(df).iloc[-1])

    last_close = float(close.iloc[-1])
    e20, e50, e200 = float(ema20.iloc[-1]), float(ema50.iloc[-1]), float(ema200.iloc[-1])
    adx_last = float(adx.iloc[-1])

    if e20 > e50 > e200 and last_close > e20:
        trend_direction = "uptrend"
    elif e20 < e50 < e200 and last_close < e20:
        trend_direction = "downtrend"
    else:
        trend_direction = "sideways"

    rsi_last = float(rsi14.iloc[-1])
    macd_hist_last = float(macd_hist.iloc[-1])
    if rsi_last > 58 and macd_hist_last > 0:
        momentum_state = "bullish"
    elif rsi_last < 42 and macd_hist_last < 0:
        momentum_state = "bearish"
    else:
        momentum_state = "neutral"

    trend_strength = "strong" if adx_last >= 25 else ("developing" if adx_last >= 18 else "weak/absent")
    vol_desc = "above-average" if vol_vs_avg > 1.15 else ("below-average" if vol_vs_avg < 0.85 else "average")

    sr_bits = f"support near {s1:,.1f} and resistance near {r1:,.1f} (pivot-based)"
    if max_oi_call_strike and max_oi_put_strike:
        sr_bits += (f"; option-chain OI shows heaviest Put OI (support) at {max_oi_put_strike:,.0f} "
                    f"and heaviest Call OI (resistance) at {max_oi_call_strike:,.0f}")

    summary = (
        f"{symbol} is in a {trend_direction} ({trend_strength} trend, ADX {adx_last:.1f}) trading at "
        f"{last_close:,.2f}, with {momentum_state} momentum (RSI14 {rsi_last:.1f}, MACD histogram "
        f"{macd_hist_last:+.2f}). Volume is {vol_desc} versus its 20-day average. Near-term "
        f"{sr_bits}. 20-day swing range is {swing_low:,.1f}–{swing_high:,.1f}, and annualised "
        f"historical volatility is running around {hist_vol:.1f}%."
    )

    return TechnicalRead(
        symbol=symbol, as_of=str(df["ts"].iloc[-1]), close=last_close,
        ema20=e20, ema50=e50, ema200=e200, adx=adx_last, rsi14=rsi_last,
        macd=float(macd_line.iloc[-1]), macd_signal=float(macd_signal.iloc[-1]), macd_hist=macd_hist_last,
        stoch_k=float(stoch_k.iloc[-1]), stoch_d=float(stoch_d.iloc[-1]), atr=float(atr.iloc[-1]),
        bb_upper=float(bb_u.iloc[-1]), bb_mid=float(bb_m.iloc[-1]), bb_lower=float(bb_l.iloc[-1]),
        hist_vol=hist_vol, pivot=float(pivot), r1=float(r1), r2=float(r2), s1=float(s1), s2=float(s2),
        swing_high=swing_high, swing_low=swing_low, volume_vs_avg20=vol_vs_avg, obv=obv,
        trend_direction=trend_direction, momentum_state=momentum_state,
        max_oi_call_strike=max_oi_call_strike, max_oi_put_strike=max_oi_put_strike,
        summary_text=summary,
    )


def max_oi_support_resistance(option_chain_df: pd.DataFrame) -> tuple[float | None, float | None]:
    """Nearest-expiry heaviest-Call-OI strike (resistance) and heaviest-Put-OI
    strike (support) — same manual logic used on the crude chain, per the brief."""
    if option_chain_df is None or option_chain_df.empty:
        return None, None
    nearest_expiry = option_chain_df["expiry"].min()
    chain = option_chain_df[option_chain_df["expiry"] == nearest_expiry]
    if chain.empty:
        return None, None
    resistance = float(chain.loc[chain["ce_oi"].idxmax(), "strike"])
    support = float(chain.loc[chain["pe_oi"].idxmax(), "strike"])
    return resistance, support
