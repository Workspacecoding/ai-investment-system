from sqlalchemy import BigInteger, Column, Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.sql import func

from app.database import Base


class BacktestRun(Base):
    __tablename__ = "backtest_runs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    market = Column(String(50))
    strategy_type = Column(String(100), nullable=False)
    initial_capital = Column(Numeric(18, 4), nullable=False)
    final_capital = Column(Numeric(18, 4), nullable=False)
    total_return_percent = Column(Numeric(10, 4), nullable=False)
    max_drawdown = Column(Numeric(10, 4), nullable=False)
    win_rate = Column(Numeric(10, 4), nullable=False)
    total_trades = Column(Integer, nullable=False)
    profit_factor = Column(Numeric(10, 4), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class BacktestTrade(Base):
    __tablename__ = "backtest_trades"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    backtest_run_id = Column(BigInteger, ForeignKey("backtest_runs.id"), nullable=False)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    strategy_type = Column(String(100), nullable=False)
    entry_date = Column(Date, nullable=False)
    exit_date = Column(Date, nullable=False)
    entry_price = Column(Numeric(18, 4), nullable=False)
    exit_price = Column(Numeric(18, 4), nullable=False)
    quantity = Column(Numeric(18, 4), nullable=False)
    pnl = Column(Numeric(18, 4), nullable=False)
    pnl_percent = Column(Numeric(10, 4), nullable=False)
    holding_days = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class FactorBacktestResult(Base):
    __tablename__ = "factor_backtest_results"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    factor_name = Column(String(100), nullable=False)
    factor_type = Column(String(50), nullable=False)
    industry_id = Column(BigInteger, ForeignKey("industries.id"), nullable=True)
    market = Column(String(50))
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_signals = Column(Integer, nullable=False)
    win_rate = Column(Numeric(10, 4), nullable=False)
    avg_return_percent = Column(Numeric(10, 4), nullable=False)
    max_drawdown = Column(Numeric(10, 4), nullable=False)
    profit_factor = Column(Numeric(10, 4), nullable=False)
    factor_rank = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
