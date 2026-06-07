from datetime import date, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.news import (
    IndustrySentimentSnapshotResponse,
    NewsArticleCreate,
    NewsArticleResponse,
)
from app.services.news_service import (
    calculate_industry_sentiment,
    create_news_article,
    get_latest_industry_sentiment,
    get_news_article_or_404,
    list_news_articles,
    rank_industry_sentiment,
)


router = APIRouter()


@router.post("/news", response_model=NewsArticleResponse)
def post_news_article(
    article_create: NewsArticleCreate,
    db: Session = Depends(get_db),
):
    return create_news_article(db, article_create)


@router.get("/news", response_model=list[NewsArticleResponse])
def get_news_articles(
    asset_id: int | None = None,
    industry_id: int | None = None,
    market: str | None = None,
    sentiment_label: str | None = None,
    topic_tag: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
):
    return list_news_articles(
        db,
        asset_id=asset_id,
        industry_id=industry_id,
        market=market,
        sentiment_label=sentiment_label,
        topic_tag=topic_tag,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/news/{news_id}", response_model=NewsArticleResponse)
def get_news_article(news_id: int, db: Session = Depends(get_db)):
    return get_news_article_or_404(db, news_id)


@router.get(
    "/industries/sentiment/ranking",
    response_model=list[IndustrySentimentSnapshotResponse],
)
def get_industry_sentiment_ranking(db: Session = Depends(get_db)):
    return rank_industry_sentiment(db)


@router.post(
    "/industries/{industry_id}/sentiment/calculate",
    response_model=IndustrySentimentSnapshotResponse,
)
def post_calculate_industry_sentiment(
    industry_id: int,
    snapshot_date: date = Query(...),
    db: Session = Depends(get_db),
):
    return calculate_industry_sentiment(db, industry_id, snapshot_date)


@router.get(
    "/industries/{industry_id}/sentiment/latest",
    response_model=IndustrySentimentSnapshotResponse,
)
def get_industry_sentiment_latest(industry_id: int, db: Session = Depends(get_db)):
    return get_latest_industry_sentiment(db, industry_id)
