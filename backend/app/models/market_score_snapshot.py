from sqlalchemy import BigInteger, Boolean, Column, Date, DateTime, Float, JSON, String, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class MarketScoreSnapshot(Base):
    """Daily MarketScore snapshot — one record per market per date."""
    __tablename__ = "market_score_snapshots"
    __table_args__ = (UniqueConstraint("record_date", "market_code", name="uq_market_score_snapshot"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    record_date = Column(Date, nullable=False)
    market_code = Column(String(20), nullable=False)
    score = Column(Float, nullable=False)
    # 強勢 / 偏多 / 中性 / 偏弱 / 弱勢
    status = Column(String(20), nullable=False)
    # [{field_key, display_name, score, weight, contribution, is_reverse}]
    breakdown = Column(JSON, nullable=True)
    formula_version = Column(String(20), nullable=True, default="v1.0")

    # Filled in later for validation
    future_return_5d = Column(Float, nullable=True)
    future_return_10d = Column(Float, nullable=True)
    future_return_20d = Column(Float, nullable=True)
    is_hit = Column(Boolean, nullable=True)   # score>=80 → 20d return > 0

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
