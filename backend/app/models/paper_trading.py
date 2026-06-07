from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.database import Base


class PaperPortfolio(Base):
    __tablename__ = "paper_portfolios"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    initial_cash = Column(Numeric(18, 4), nullable=False)
    cash_balance = Column(Numeric(18, 4), nullable=False)
    total_market_value = Column(Numeric(18, 4), nullable=False, default=0)
    total_equity = Column(Numeric(18, 4), nullable=False, default=0)
    realized_pnl = Column(Numeric(18, 4), nullable=False, default=0)
    unrealized_pnl = Column(Numeric(18, 4), nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class PaperPosition(Base):
    __tablename__ = "paper_positions"
    __table_args__ = (
        UniqueConstraint("portfolio_id", "asset_id", name="uq_paper_position_asset"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    portfolio_id = Column(BigInteger, ForeignKey("paper_portfolios.id"), nullable=False)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    quantity = Column(Numeric(18, 4), nullable=False)
    avg_cost = Column(Numeric(18, 4), nullable=False)
    current_price = Column(Numeric(18, 4), nullable=False)
    market_value = Column(Numeric(18, 4), nullable=False)
    unrealized_pnl = Column(Numeric(18, 4), nullable=False)
    unrealized_pnl_percent = Column(Numeric(10, 4), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class PaperOrder(Base):
    __tablename__ = "paper_orders"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    portfolio_id = Column(BigInteger, ForeignKey("paper_portfolios.id"), nullable=False)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    trade_plan_id = Column(BigInteger, ForeignKey("trade_plans.id"), nullable=True)
    side = Column(Enum("buy", "sell"), nullable=False)
    order_type = Column(Enum("market", "limit"), nullable=False)
    price = Column(Numeric(18, 4), nullable=False)
    quantity = Column(Numeric(18, 4), nullable=False)
    amount = Column(Numeric(18, 4), nullable=False)
    status = Column(Enum("filled", "cancelled"), nullable=False, default="filled")
    executed_at = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())


class PaperTradeLog(Base):
    __tablename__ = "paper_trade_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    portfolio_id = Column(BigInteger, ForeignKey("paper_portfolios.id"), nullable=False)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    buy_order_id = Column(BigInteger, ForeignKey("paper_orders.id"), nullable=True)
    sell_order_id = Column(BigInteger, ForeignKey("paper_orders.id"), nullable=True)
    realized_pnl = Column(Numeric(18, 4), nullable=False)
    realized_pnl_percent = Column(Numeric(10, 4), nullable=False)
    holding_days = Column(Integer, nullable=False, default=0)
    strategy_type = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())
