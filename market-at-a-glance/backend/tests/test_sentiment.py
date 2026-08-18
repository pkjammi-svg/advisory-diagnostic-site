from app.sentiment.scorer import score_headline, aggregate_sentiment


def test_score_headline_positive():
    assert score_headline("Nifty rallies as buying interest surges across the board") > 0.3


def test_score_headline_negative():
    assert score_headline("Nifty plunges as selloff intensifies amid weak global cues") < -0.3


def test_score_headline_negation_flips_sign():
    assert score_headline("Analysts say this is not a bearish signal") >= 0


def test_score_headline_neutral_on_no_lexicon_hits():
    assert score_headline("Markets await fresh data this week") == 0.0


def test_aggregate_sentiment_quiet_on_no_articles():
    avg, label, consensus = aggregate_sentiment([])
    assert (avg, label, consensus) == (0.0, "neutral", "quiet")


def test_aggregate_sentiment_conflicting():
    avg, label, consensus = aggregate_sentiment([0.8, -0.8, 0.7, -0.6])
    assert consensus == "conflicting"


def test_aggregate_sentiment_consensus_bullish():
    avg, label, consensus = aggregate_sentiment([0.6, 0.7, 0.5])
    assert label == "bullish"
    assert consensus == "consensus"
