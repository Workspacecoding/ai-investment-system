from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.sql import func

from app.database import Base


class PortfolioOptimization(Base):
    __tablename__ = "portfolio_optimizations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    portfolio_name = Column(String(255), nullable=False)
    market_state = Column(String(50), nullable=False)
    strategy_type = Column(String(100), nullable=False)
    risk_level = Column(String(50), nullable=False)
    total_capital = Column(Numeric(18, 4), nullable=False)
    expected_return = Column(Numeric(10, 4), nullable=False)
    expected_risk = Column(Numeric(10, 4), nullable=False)
    expected_sharpe = Column(Numeric(10, 4), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class PortfolioOptimizationAsset(Base):
    __tablename__ = "portfolio_optimization_assets"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    optimization_id = Column(BigInteger, ForeignKey("portfolio_optimizations.id"), nullable=False)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    allocation_percent = Column(Numeric(10, 4), nullable=False)
    allocation_amount = Column(Numeric(18, 4), nullable=False)
    asset_score = Column(Numeric(10, 4), nullable=False)
    recommendation_type = Column(Enum("core", "growth", "aggressive"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
