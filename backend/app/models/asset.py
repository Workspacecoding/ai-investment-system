from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.database import Base


class Asset(Base):
    __tablename__ = "assets"
    __table_args__ = (
        UniqueConstraint("symbol", "market", name="uq_asset_symbol_market"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    symbol = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    market = Column(String(50), nullable=False)
    asset_type = Column(Enum("stock", "etf", "crypto"), nullable=False)
    industry_id = Column(BigInteger, ForeignKey("industries.id"), nullable=True)
    currency = Column(String(20), nullable=False)
    is_penny_stock = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    data_sync_enabled = Column(Boolean, nullable=False, default=False)
    last_price_synced_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )


class UserWatchlist(Base):
    __tablename__ = "user_watchlists"
    __table_args__ = (
        UniqueConstraint("user_id", "asset_id", name="uq_user_watchlist_asset"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    note = Column(Text)
    is_sync_enabled = Column(Boolean, nullable=False, default=False)
    sync_start_date = Column(Date, nullable=True)
    sync_end_date = Column(Date, nullable=True)
    last_synced_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class RecommendedAsset(Base):
    __tablename__ = "recommended_assets"
    __table_args__ = (
        UniqueConstraint(
            "asset_id",
            "recommendation_date",
            "source",
            name="uq_recommended_asset_date_source",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    recommendation_date = Column(Date, nullable=False)
    source = Column(String(100), nullable=False)
    reason = Column(Text)
    score = Column(Float, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
