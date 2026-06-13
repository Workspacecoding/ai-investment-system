from sqlalchemy import (
    BigInteger,
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


class Industry(Base):
    __tablename__ = "industries"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    industry_code = Column(String(50), unique=True, nullable=False)
    industry_name = Column(String(255), nullable=False)
    market = Column(String(50), nullable=False)
    description = Column(Text)
    # tracking_status: "core" | "observation" | "disabled"
    tracking_status = Column(String(20), nullable=False, server_default="disabled")
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


class IndustryMomentum(Base):
    __tablename__ = "industry_momentum"
    __table_args__ = (
        UniqueConstraint("industry_id", "snapshot_date", name="uq_industry_momentum_date"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    industry_id = Column(BigInteger, ForeignKey("industries.id"), nullable=False)
    snapshot_date = Column(Date, nullable=False)
    avg_return_1m = Column(Float, nullable=False)
    avg_return_3m = Column(Float, nullable=False)
    avg_return_6m = Column(Float, nullable=False)
    volume_score = Column(Float, nullable=False)
    trend_score = Column(Float, nullable=False)
    sentiment_score = Column(Float, nullable=True)
    momentum_score = Column(Float, nullable=False)
    momentum_version = Column(String(50), nullable=False, server_default="v2")
    ranking = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
