from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class NewsArticleCreate(BaseModel):
    title: str
    source: str
    url: str | None = None
    published_at: datetime
    summary: str
    raw_content: str | None = None
    asset_id: int | None = None
    industry_id: int | None = None
    market: str | None = None
    topic_tags: str | None = None
    sentiment_label: str
    sentiment_score: float | None = Field(default=None, ge=-1, le=1)
    impact_score: float = Field(ge=0, le=100)
    freshness_score: float | None = Field(default=None, ge=0, le=100)


class NewsArticleResponse(BaseModel):
    id: int
    title: str
    source: str
    url: str | None = None
    published_at: datetime
    summary: str
    raw_content: str | None = None
    asset_id: int | None = None
    industry_id: int | None = None
    market: str | None = None
    topic_tags: str | None = None
    sentiment_label: str
    sentiment_score: float
    impact_score: float
    freshness_score: float
    weighted_news_score: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IndustrySentimentSnapshotResponse(BaseModel):
    id: int
    industry_id: int
    snapshot_date: date
    avg_sentiment_score: float
    avg_impact_score: float
    news_count: int
    news_heat_score: float
    industry_news_score: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
