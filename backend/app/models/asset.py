from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
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
    asset_type = Column(String(50), nullable=False, default="stock")
    industry_id = Column(BigInteger, ForeignKey("industries.id"), nullable=True)
    api_config_id = Column(BigInteger, ForeignKey("api_configs.id"), nullable=True)
    description = Column(Text, nullable=True)
    currency = Column(String(20), nullable=False)
    api_code = Column(String(100), nullable=True)          # API-specific code (may differ from symbol)
    update_frequency = Column(String(20), nullable=True)   # realtime / daily / weekly / monthly
    in_swing_pool = Column(Boolean, nullable=False, default=False)   # 加入波段推薦池
    in_newsletter = Column(Boolean, nullable=False, default=False)   # 加入電子報追蹤
    needs_backtest = Column(Boolean, nullable=False, default=False)  # 是否需要回測
    is_penny_stock = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    data_sync_enabled = Column(Boolean, nullable=False, default=False)
    last_price_synced_at = Column(DateTime, nullable=True)
    current_model_id = Column(BigInteger, nullable=True)
    module_calc_indicator_ids = Column(JSON, nullable=True)
    module_validation_asset_ids = Column(JSON, nullable=True)
    module_validation_indicator_ids = Column(JSON, nullable=True)
    module_validation_period_days = Column(Integer, nullable=True, default=30)
    module_result_indicator_ids = Column(JSON, nullable=True)
    module_formula_expr = Column(Text, nullable=True)
    module_validation_conditions = Column(Text, nullable=True)
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
