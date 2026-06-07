from sqlalchemy import BigInteger, Column, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    source = Column(String(255), nullable=False)
    url = Column(Text)
    published_at = Column(DateTime, nullable=False)
    summary = Column(Text, nullable=False)
    raw_content = Column(Text)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=True)
    industry_id = Column(BigInteger, ForeignKey("industries.id"), nullable=True)
    market = Column(String(50))
    topic_tags = Column(Text)
    sentiment_label = Column(Enum("positive", "neutral", "negative"), nullable=False)
    sentiment_score = Column(Numeric(10, 4), nullable=False)
    impact_score = Column(Numeric(10, 4), nullable=False)
    freshness_score = Column(Numeric(10, 4), nullable=False)
    weighted_news_score = Column(Numeric(10, 4), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class IndustrySentimentSnapshot(Base):
    __tablename__ = "industry_sentiment_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "industry_id",
            "snapshot_date",
            name="uq_industry_sentiment_snapshot_date",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    industry_id = Column(BigInteger, ForeignKey("industries.id"), nullable=False)
    snapshot_date = Column(Date, nullable=False)
    avg_sentiment_score = Column(Numeric(10, 4), nullable=False)
    avg_impact_score = Column(Numeric(10, 4), nullable=False)
    news_count = Column(Integer, nullable=False)
    news_heat_score = Column(Numeric(10, 4), nullable=False)
    industry_news_score = Column(Numeric(10, 4), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
