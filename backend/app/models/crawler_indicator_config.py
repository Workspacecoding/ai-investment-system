from sqlalchemy import BigInteger, Boolean, Column, DateTime, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class CrawlerIndicatorConfig(Base):
    """Generic per-indicator crawler config shared across market / industry / asset scopes."""
    __tablename__ = "crawler_indicator_configs"
    __table_args__ = (
        UniqueConstraint("scope_type", "scope_id", "indicator_id", name="uq_crawler_indicator_config"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    scope_type = Column(String(20), nullable=False, index=True)   # market | industry | asset
    scope_id = Column(BigInteger, nullable=False, index=True)
    indicator_id = Column(BigInteger, nullable=True)
    indicator_name = Column(String(100), nullable=False)
    indicator_type = Column(String(30), nullable=True)            # fundamental / technical / chips / market / industry
    api_source_id = Column(BigInteger, nullable=True)
    is_enabled = Column(Boolean, nullable=False, default=True)
    auto_crawl_enabled = Column(Boolean, nullable=False, default=False)
    manual_crawl_enabled = Column(Boolean, nullable=False, default=True)
    crawl_frequency = Column(String(30), nullable=True)           # daily / weekly / monthly / quarterly / cron
    crawl_time = Column(String(50), nullable=True)
    last_crawled_at = Column(DateTime, nullable=True)
    next_crawl_at = Column(DateTime, nullable=True)
    last_manual_crawled_at = Column(DateTime, nullable=True)
    crawl_status = Column(String(20), nullable=False, default="waiting")  # waiting/running/success/failed/stopped
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
