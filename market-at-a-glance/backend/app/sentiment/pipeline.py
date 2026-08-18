"""Scores stored news articles for an instrument and persists a daily
SentimentSnapshot, surfacing the top 3-5 headlines with their scores."""
from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import Instrument, NewsArticle, SentimentSnapshot
from app.sentiment.scorer import score_headline, aggregate_sentiment


def run_sentiment_analysis(session: Session, inst: Instrument, lookback_hours: int = 48):
    cutoff = datetime.utcnow() - timedelta(hours=lookback_hours)
    articles = (session.query(NewsArticle)
                .filter(NewsArticle.instrument_id == inst.id,
                        NewsArticle.published_at >= cutoff)
                .order_by(NewsArticle.published_at.desc()).all())

    if not articles:
        # widen the window once so a quiet day still shows *something* if any
        # news exists at all, rather than reading as "no data".
        articles = (session.query(NewsArticle).filter_by(instrument_id=inst.id)
                    .order_by(NewsArticle.published_at.desc()).limit(5).all())

    for a in articles:
        if a.sentiment_score is None:
            a.sentiment_score = score_headline(a.headline)
    session.commit()

    scores = [a.sentiment_score for a in articles if a.sentiment_score is not None]
    avg, label, consensus = aggregate_sentiment(scores)

    today = datetime.utcnow().date()
    snap = session.query(SentimentSnapshot).filter_by(
        instrument_id=inst.id, as_of=datetime(today.year, today.month, today.day),
    ).one_or_none()
    if snap is None:
        snap = SentimentSnapshot(instrument_id=inst.id, as_of=datetime(today.year, today.month, today.day))
        session.add(snap)
    snap.score, snap.article_count, snap.consensus, snap.label = avg, len(articles), consensus, label
    session.commit()

    top_headlines = [
        {"headline": a.headline, "url": a.url, "source": a.source, "score": a.sentiment_score}
        for a in articles[:5]
    ]
    return {
        "score": avg, "label": label, "consensus": consensus,
        "article_count": len(articles), "top_headlines": top_headlines,
    }
