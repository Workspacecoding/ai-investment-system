from datetime import date, datetime, time, timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.industry import Industry
from app.models.news import IndustrySentimentSnapshot, NewsArticle
from app.schemas.news import NewsArticleCreate


SENTIMENT_SCORE_BY_LABEL = {
    "positive": 0.7,
    "neutral": 0,
    "negative": -0.7,
}


def to_decimal(value: float | int | Decimal) -> Decimal:
    return Decimal(str(round(float(value), 4))).quantize(Decimal("0.0001"))


def get_asset_or_404(db: Session, asset_id: int):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return asset


def get_industry_or_404(db: Session, industry_id: int):
    industry = db.query(Industry).filter(Industry.id == industry_id).first()
    if not industry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Industry not found",
        )
    return industry


def calculate_freshness_score(published_at: datetime, today: date | None = None) -> Decimal:
    current_date = today or datetime.utcnow().date()
    age_days = (current_date - published_at.date()).days
    if age_days <= 0:
        return Decimal("100")
    if age_days <= 3:
        return Decimal("80")
    if age_days <= 7:
        return Decimal("50")
    return Decimal("20")


def calculate_weighted_news_score(
    sentiment_score: Decimal,
    impact_score: Decimal,
    freshness_score: Decimal,
) -> Decimal:
    return to_decimal(sentiment_score * impact_score * freshness_score / Decimal("100"))


def create_news_article(db: Session, article_create: NewsArticleCreate) -> NewsArticle:
    if article_create.sentiment_label not in SENTIMENT_SCORE_BY_LABEL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid sentiment label",
        )
    if article_create.asset_id is not None:
        get_asset_or_404(db, article_create.asset_id)
    if article_create.industry_id is not None:
        get_industry_or_404(db, article_create.industry_id)

    sentiment_score = (
        to_decimal(article_create.sentiment_score)
        if article_create.sentiment_score is not None
        else to_decimal(SENTIMENT_SCORE_BY_LABEL[article_create.sentiment_label])
    )
    freshness_score = (
        to_decimal(article_create.freshness_score)
        if article_create.freshness_score is not None
        else calculate_freshness_score(article_create.published_at)
    )
    impact_score = to_decimal(article_create.impact_score)
    article = NewsArticle(
        **article_create.model_dump(exclude={"sentiment_score", "freshness_score"}),
        sentiment_score=sentiment_score,
        freshness_score=freshness_score,
        weighted_news_score=calculate_weighted_news_score(
            sentiment_score,
            impact_score,
            freshness_score,
        ),
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


def list_news_articles(
    db: Session,
    asset_id: int | None = None,
    industry_id: int | None = None,
    market: str | None = None,
    sentiment_label: str | None = None,
    topic_tag: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> list[NewsArticle]:
    query = db.query(NewsArticle)
    if asset_id is not None:
        query = query.filter(NewsArticle.asset_id == asset_id)
    if industry_id is not None:
        query = query.filter(NewsArticle.industry_id == industry_id)
    if market is not None:
        query = query.filter(NewsArticle.market == market)
    if sentiment_label is not None:
        query = query.filter(NewsArticle.sentiment_label == sentiment_label)
    if topic_tag is not None:
        query = query.filter(NewsArticle.topic_tags.like(f"%{topic_tag}%"))
    if date_from is not None:
        query = query.filter(NewsArticle.published_at >= date_from)
    if date_to is not None:
        query = query.filter(NewsArticle.published_at <= date_to)
    return query.order_by(NewsArticle.published_at.desc(), NewsArticle.id.desc()).all()


def get_news_article_or_404(db: Session, news_id: int) -> NewsArticle:
    article = db.query(NewsArticle).filter(NewsArticle.id == news_id).first()
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="News article not found",
        )
    return article


def calculate_news_heat_score(news_count: int) -> Decimal:
    if news_count >= 10:
        return Decimal("90")
    if news_count >= 5:
        return Decimal("70")
    if news_count >= 2:
        return Decimal("50")
    if news_count == 1:
        return Decimal("30")
    return Decimal("0")


def calculate_industry_sentiment(
    db: Session,
    industry_id: int,
    snapshot_date: date,
) -> IndustrySentimentSnapshot:
    get_industry_or_404(db, industry_id)
    start_datetime = datetime.combine(snapshot_date - timedelta(days=7), time.min)
    end_datetime = datetime.combine(snapshot_date, time.max)
    articles = (
        db.query(NewsArticle)
        .filter(
            NewsArticle.industry_id == industry_id,
            NewsArticle.published_at >= start_datetime,
            NewsArticle.published_at <= end_datetime,
        )
        .all()
    )
    news_count = len(articles)
    avg_sentiment_score = (
        sum((Decimal(article.sentiment_score) for article in articles), Decimal("0"))
        / news_count
        if news_count
        else Decimal("0")
    )
    avg_impact_score = (
        sum((Decimal(article.impact_score) for article in articles), Decimal("0"))
        / news_count
        if news_count
        else Decimal("0")
    )
    news_heat_score = calculate_news_heat_score(news_count)
    industry_news_score = (avg_sentiment_score * Decimal("50")) + (
        news_heat_score * Decimal("0.5")
    )

    snapshot = (
        db.query(IndustrySentimentSnapshot)
        .filter(
            IndustrySentimentSnapshot.industry_id == industry_id,
            IndustrySentimentSnapshot.snapshot_date == snapshot_date,
        )
        .first()
    )
    data = {
        "avg_sentiment_score": to_decimal(avg_sentiment_score),
        "avg_impact_score": to_decimal(avg_impact_score),
        "news_count": news_count,
        "news_heat_score": to_decimal(news_heat_score),
        "industry_news_score": to_decimal(industry_news_score),
    }
    if snapshot:
        for field, value in data.items():
            setattr(snapshot, field, value)
    else:
        snapshot = IndustrySentimentSnapshot(
            industry_id=industry_id,
            snapshot_date=snapshot_date,
            **data,
        )
        db.add(snapshot)

    db.commit()
    db.refresh(snapshot)
    return snapshot


def get_latest_industry_sentiment(
    db: Session,
    industry_id: int,
) -> IndustrySentimentSnapshot:
    get_industry_or_404(db, industry_id)
    snapshot = (
        db.query(IndustrySentimentSnapshot)
        .filter(IndustrySentimentSnapshot.industry_id == industry_id)
        .order_by(
            IndustrySentimentSnapshot.snapshot_date.desc(),
            IndustrySentimentSnapshot.id.desc(),
        )
        .first()
    )
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Industry sentiment snapshot not found",
        )
    return snapshot


def rank_industry_sentiment(db: Session) -> list[IndustrySentimentSnapshot]:
    latest_dates = {}
    for snapshot in db.query(IndustrySentimentSnapshot).all():
        current = latest_dates.get(snapshot.industry_id)
        if current is None or snapshot.snapshot_date > current:
            latest_dates[snapshot.industry_id] = snapshot.snapshot_date
    if not latest_dates:
        return []
    rows = []
    for industry_id, snapshot_date in latest_dates.items():
        snapshot = (
            db.query(IndustrySentimentSnapshot)
            .filter(
                IndustrySentimentSnapshot.industry_id == industry_id,
                IndustrySentimentSnapshot.snapshot_date == snapshot_date,
            )
            .order_by(IndustrySentimentSnapshot.id.desc())
            .first()
        )
        if snapshot:
            rows.append(snapshot)
    return sorted(rows, key=lambda item: (float(item.industry_news_score), item.id), reverse=True)
