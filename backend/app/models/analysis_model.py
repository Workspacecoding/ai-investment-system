from sqlalchemy import BigInteger, Column, DateTime, JSON, String, Text
from sqlalchemy.sql import func

from app.database import Base


class AnalysisModel(Base):
    """Versioned analysis models (e.g. US_Market_V2, Semiconductor_V1)."""
    __tablename__ = "analysis_models"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)        # "美股市場模型"
    version = Column(String(50), nullable=False)       # "V1", "V2", "v2.1"
    scope_type = Column(String(20), nullable=False)    # "market" | "industry" | "asset"
    market_code = Column(String(20), nullable=True)    # "TW", "US" — links to market_configs.code
    description = Column(Text, nullable=True)
    # "active" = 啟用中, "testing" = 測試中, "disabled" = 停用
    status = Column(String(20), nullable=False, default="testing")
    source_id = Column(BigInteger, nullable=True)   # FK to market/industry/asset id
    # Snapshot of formula+validation settings at the time this version was created
    formula_snapshot = Column(JSON, nullable=True)
    validation_snapshot = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
