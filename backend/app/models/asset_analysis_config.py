from sqlalchemy import BigInteger, Boolean, Column, DateTime, JSON, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class AssetAnalysisConfig(Base):
    """Per-asset analysis settings: which indicators/models are enabled and what to show on frontend."""
    __tablename__ = "asset_analysis_configs"
    __table_args__ = (UniqueConstraint("asset_id", name="uq_asset_analysis_config"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, nullable=False)

    # Enabled indicator keys (JSON arrays of string keys)
    technical_indicators = Column(JSON, nullable=True)   # ["ma_align", "rsi", ...]
    fundamental_indicators = Column(JSON, nullable=True) # ["eps", "roe", ...]
    chips_indicators = Column(JSON, nullable=True)       # ["foreign_net_buy", ...]
    applied_models = Column(JSON, nullable=True)         # ["stock_swing", "etf_swing", ...]

    # Frontend display toggles
    show_technical = Column(Boolean, nullable=False, default=True)
    show_fundamental = Column(Boolean, nullable=False, default=True)
    show_chips = Column(Boolean, nullable=False, default=False)
    show_model_score = Column(Boolean, nullable=False, default=True)
    show_recommendation = Column(Boolean, nullable=False, default=True)
    show_risk = Column(Boolean, nullable=False, default=False)
    show_backtest_summary = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
