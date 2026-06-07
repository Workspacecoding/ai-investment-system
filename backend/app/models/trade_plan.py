from sqlalchemy import BigInteger, Column, Date, DateTime, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class TradePlan(Base):
    __tablename__ = "trade_plans"
    __table_args__ = (
        UniqueConstraint("asset_id", "trade_date", name="uq_trade_plan_asset_date"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    trade_date = Column(Date, nullable=False)
    final_score = Column(Numeric(10, 4), nullable=False)
    rating = Column(String(50), nullable=False)
    action = Column(Enum("buy", "watch", "hold", "sell", "avoid"), nullable=False)
    current_price = Column(Numeric(18, 4), nullable=False)
    entry_price = Column(Numeric(18, 4))
    stop_loss_price = Column(Numeric(18, 4), nullable=False)
    take_profit_1 = Column(Numeric(18, 4), nullable=False)
    take_profit_2 = Column(Numeric(18, 4), nullable=False)
    expected_return_percent = Column(Numeric(10, 4), nullable=False)
    max_loss_percent = Column(Numeric(10, 4), nullable=False)
    risk_reward_ratio = Column(Numeric(10, 4), nullable=False)
    strategy_type = Column(String(100), nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
