from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class PerformanceReport(Base):
    __tablename__ = "performance_reports"
    __table_args__ = (
        UniqueConstraint(
            "portfolio_id",
            "report_year",
            "report_month",
            name="uq_performance_report_month",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    portfolio_id = Column(BigInteger, ForeignKey("paper_portfolios.id"), nullable=False)
    report_year = Column(Integer, nullable=False)
    report_month = Column(Integer, nullable=False)
    initial_equity = Column(Numeric(18, 4), nullable=False)
    ending_equity = Column(Numeric(18, 4), nullable=False)
    total_return_percent = Column(Numeric(10, 4), nullable=False)
    realized_pnl = Column(Numeric(18, 4), nullable=False)
    unrealized_pnl = Column(Numeric(18, 4), nullable=False)
    total_trades = Column(Integer, nullable=False)
    win_trades = Column(Integer, nullable=False)
    lose_trades = Column(Integer, nullable=False)
    win_rate = Column(Numeric(10, 4), nullable=False)
    max_drawdown = Column(Numeric(10, 4), nullable=False)
    best_asset_id = Column(BigInteger, nullable=True)
    worst_asset_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class StrategyPerformance(Base):
    __tablename__ = "strategy_performance"
    __table_args__ = (
        UniqueConstraint(
            "portfolio_id",
            "strategy_type",
            name="uq_strategy_performance_portfolio_strategy",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    portfolio_id = Column(BigInteger, ForeignKey("paper_portfolios.id"), nullable=False)
    strategy_type = Column(String(100), nullable=False)
    total_trades = Column(Integer, nullable=False)
    win_rate = Column(Numeric(10, 4), nullable=False)
    avg_profit_percent = Column(Numeric(10, 4), nullable=False)
    avg_loss_percent = Column(Numeric(10, 4), nullable=False)
    net_return_percent = Column(Numeric(10, 4), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
