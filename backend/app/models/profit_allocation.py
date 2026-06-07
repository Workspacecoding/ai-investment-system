from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.sql import func

from app.database import Base


class ProfitAllocation(Base):
    __tablename__ = "profit_allocations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    portfolio_id = Column(BigInteger, ForeignKey("paper_portfolios.id"), nullable=False)
    realized_profit = Column(Numeric(18, 4), nullable=False)
    entertainment_amount = Column(Numeric(18, 4), nullable=False)
    reinvest_amount = Column(Numeric(18, 4), nullable=False)
    cash_amount = Column(Numeric(18, 4), nullable=False)
    core_asset_amount = Column(Numeric(18, 4), nullable=False)
    entertainment_ratio = Column(Numeric(10, 4), nullable=False)
    reinvest_ratio = Column(Numeric(10, 4), nullable=False)
    cash_ratio = Column(Numeric(10, 4), nullable=False)
    core_asset_ratio = Column(Numeric(10, 4), nullable=False)
    allocation_version = Column(String(50), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ProfitAllocationRecommendation(Base):
    __tablename__ = "profit_allocation_recommendations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    allocation_id = Column(BigInteger, ForeignKey("profit_allocations.id"), nullable=False)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    recommendation_type = Column(Enum("core", "growth", "speculative"), nullable=False)
    allocation_amount = Column(Numeric(18, 4), nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
