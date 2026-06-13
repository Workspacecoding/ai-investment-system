from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, JSON, String, Text, Unicode
from sqlalchemy.sql import func

from app.database import Base


class MarketConfig(Base):
    __tablename__ = "market_configs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    code = Column(String(20), unique=True, nullable=False)   # e.g. "TW", "US"
    name = Column(String(100), nullable=False)               # e.g. "台灣股市"
    currency = Column(String(10), nullable=False)            # e.g. "TWD"
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    is_tracked = Column(Boolean, nullable=False, default=False)
    display_order = Column(Integer, nullable=False, default=0)
    current_model_id = Column(BigInteger, nullable=True)

    # Module config fields
    # Indicator IDs (from market_indicator_configs) used in formula calculation
    module_calc_indicator_ids = Column(JSON, nullable=True)
    # Asset IDs used for model validation
    module_validation_asset_ids = Column(JSON, nullable=True)
    # Indicator IDs used for validation
    module_validation_indicator_ids = Column(JSON, nullable=True)
    # Validation period in days
    module_validation_period_days = Column(Integer, nullable=True, default=30)
    # Indicator IDs that this module outputs as results
    module_result_indicator_ids = Column(JSON, nullable=True)
    # Free-form arithmetic expression; overrides weighted sum when set
    module_formula_expr = Column(Text, nullable=True)
    # Validation condition expression, e.g. "MarketScore > 80"
    module_validation_conditions = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
