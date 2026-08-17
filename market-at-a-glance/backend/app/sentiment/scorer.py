"""Stage 3 — News & sentiment scoring.

Default model: a small finance-tuned lexicon scorer (no heavy dependency,
always available, deterministic). This satisfies the brief's "start simple"
guidance.

To upgrade: set MAAG_SENTIMENT_MODEL=finbert (config.py) and implement
`_score_finbert()` below using `transformers` (ProsusAI/finbert or similar
pretrained finance-sentiment checkpoint) — install the optional
transformers/torch lines in requirements.txt first. Everything downstream
only depends on `score_headline()` returning a float in [-1, 1], so the
swap is local to this file.
"""
from __future__ import annotations

from app.config import PROVIDERS

# A compact finance-news lexicon. Scores are weights, not just +1/-1, so
# stronger words move the needle more than mild ones.
_POSITIVE_WORDS = {
    "gain": 1, "gains": 1, "rally": 1.4, "rallies": 1.4, "surge": 1.6, "surges": 1.6,
    "jump": 1.2, "jumps": 1.2, "upgrade": 1.3, "upgrades": 1.3, "outperform": 1.2,
    "outperforms": 1.2, "buy": 0.9, "bullish": 1.4, "beat": 1.1, "beats": 1.1,
    "strong": 0.8, "record": 1.0, "growth": 0.8, "profit": 0.7, "positive": 0.7,
    "constructive": 0.9, "upbeat": 0.9, "inflows": 0.8, "recovery": 0.9,
    "recovers": 0.9, "rebound": 1.0, "rises": 0.9, "rise": 0.9, "advance": 0.7,
    "advances": 0.7, "boost": 0.9, "improving": 0.7, "raise": 0.6, "raises": 0.6,
}
_NEGATIVE_WORDS = {
    "fall": -1.0, "falls": -1.0, "falling": -1.0, "drop": -1.2, "drops": -1.2,
    "plunge": -1.7, "plunges": -1.7, "slump": -1.4, "slumps": -1.4, "downgrade": -1.3,
    "downgrades": -1.3, "underperform": -1.2, "underperforms": -1.2, "sell": -0.9,
    "bearish": -1.4, "miss": -1.1, "misses": -1.1, "weak": -0.8, "weakness": -0.8,
    "loss": -0.9, "losses": -0.9, "negative": -0.7, "concern": -0.8, "concerns": -0.8,
    "headwind": -0.9, "headwinds": -0.9, "pressure": -0.8, "decline": -0.9,
    "declines": -0.9, "selloff": -1.3, "sell-off": -1.3, "correction": -0.9,
    "slips": -0.8, "slip": -0.8, "cut": -0.7, "cuts": -0.7, "risk": -0.4, "risks": -0.4,
    "crash": -1.9, "crashes": -1.9, "volatile": -0.4, "uncertainty": -0.6,
}

_NEGATION_WORDS = {"not", "no", "never", "without"}


def _score_lexicon(text: str) -> float:
    tokens = [t.strip(".,!?():;\"'").lower() for t in text.split()]
    if not tokens:
        return 0.0
    total = 0.0
    hits = 0
    for i, tok in enumerate(tokens):
        weight = _POSITIVE_WORDS.get(tok) or _NEGATIVE_WORDS.get(tok)
        if weight is None:
            continue
        # simple negation flip if a negation word appears in the prior 2 tokens
        window = tokens[max(0, i - 2):i]
        if any(w in _NEGATION_WORDS for w in window):
            weight = -weight
        total += weight
        hits += 1
    if hits == 0:
        return 0.0
    raw = total / max(hits, 1)
    return max(-1.0, min(1.0, raw))


def _score_finbert(text: str) -> float:  # pragma: no cover - optional path
    """Optional pretrained-model path. Requires `transformers` + `torch`
    (see requirements.txt). Lazily loads the model on first call."""
    global _finbert_pipeline
    try:
        _finbert_pipeline
    except NameError:
        from transformers import pipeline
        _finbert_pipeline = pipeline("sentiment-analysis", model="ProsusAI/finbert")
    result = _finbert_pipeline(text[:512])[0]
    label = result["label"].lower()
    score = float(result["score"])
    if label == "positive":
        return score
    if label == "negative":
        return -score
    return 0.0


def score_headline(text: str) -> float:
    if PROVIDERS.sentiment_model == "finbert":
        try:
            return _score_finbert(text)
        except Exception:  # noqa: BLE001 - fall back gracefully if transformers isn't installed
            return _score_lexicon(text)
    return _score_lexicon(text)


def aggregate_sentiment(scores: list[float]) -> tuple[float, str, str]:
    """Returns (avg_score, label, consensus) where consensus is one of
    'consensus' | 'conflicting' | 'quiet' per the brief's requirement to flag
    high-volume/low-consensus vs. low-volume 'nothing changed' situations."""
    if not scores:
        return 0.0, "neutral", "quiet"

    avg = sum(scores) / len(scores)
    label = "bullish" if avg > 0.15 else ("bearish" if avg < -0.15 else "neutral")

    if len(scores) < 2:
        consensus = "quiet"
    else:
        spread = max(scores) - min(scores)
        has_both_signs = any(s > 0.15 for s in scores) and any(s < -0.15 for s in scores)
        if has_both_signs and spread > 0.6:
            consensus = "conflicting"
        else:
            consensus = "consensus"

    return round(avg, 3), label, consensus
