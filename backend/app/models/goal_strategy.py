from sqlalchemy import BigInteger, Column, Date, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.sql import func

from app.database import Base


class GoalStrategy(Base):
    __tablename__ = "goal_strategies"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    goal_id = Column(BigInteger, ForeignKey("user_goals.id"), nullable=False)
    current_capital = Column(Numeric(18, 4), nullable=False)
    target_capital = Column(Numeric(18, 4), nullable=False)
    target_date = Column(Date, nullable=False)
    required_annual_return = Column(Numeric(10, 4), nullable=False)
    required_monthly_return = Column(Numeric(10, 4), nullable=False)
    strategy_type = Column(String(100), nullable=False)
    risk_level = Column(String(50), nullable=False)
    etf_ratio = Column(Numeric(10, 4), nullable=False)
    stock_ratio = Column(Numeric(10, 4), nullable=False)
    crypto_ratio = Column(Numeric(10, 4), nullable=False)
    cash_ratio = Column(Numeric(10, 4), nullable=False)
    probability_score = Column(Numeric(10, 4), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class GoalStrategyRecommendation(Base):
    __tablename__ = "goal_strategy_recommendations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    goal_strategy_id = Column(BigInteger, ForeignKey("goal_strategies.id"), nullable=False)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    recommendation_type = Column(Enum("core", "growth", "aggressive"), nullable=False)
    allocation_percent = Column(Numeric(10, 4), nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
