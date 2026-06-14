from sqlalchemy import BigInteger, Column, DateTime, Float, Integer, Numeric, String, Text
from sqlalchemy.sql import func

from app.database import Base


class StrategyWave(Base):
    __tablename__ = "strategy_waves"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, nullable=False)
    asset_symbol = Column(String(30), nullable=False)
    strategy_name = Column(String(100), nullable=False)
    period_days = Column(Integer, nullable=True)
    activation_price = Column(Numeric(18, 4), nullable=True)
    buy_price = Column(Numeric(18, 4), nullable=True)
    sell_price_1 = Column(Numeric(18, 4), nullable=True)
    sell_price_2 = Column(Numeric(18, 4), nullable=True)
    win_rate = Column(Float, nullable=True)          # 0–100
    avg_return_pct = Column(Float, nullable=True)    # percentage
    status = Column(String(20), nullable=False, default="testing")  # active|testing|disabled
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class StrategyWaveBacktest(Base):
    __tablename__ = "strategy_wave_backtests"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    wave_id = Column(BigInteger, nullable=False)
    backtest_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    # model / indicator reference
    analysis_model_id = Column(BigInteger, nullable=True)
    analysis_model_name = Column(String(200), nullable=True)
    validation_indicator_id = Column(BigInteger, nullable=True)
    validation_indicator_name = Column(String(200), nullable=True)
    model_score = Column(Float, nullable=True)          # 模型分數
    # price action
    validation_target = Column(String(100), nullable=True)
    entry_price = Column(Float, nullable=True)          # 進場價
    exit_price = Column(Float, nullable=True)           # 出場價
    growth_pct = Column(Float, nullable=True)           # 漲跌%
    holding_days = Column(Integer, nullable=True)       # 持有天數
    # performance
    win_rate = Column(Float, nullable=True)             # 勝率%
    avg_return_pct = Column(Float, nullable=True)       # 平均報酬%
    max_drawdown_pct = Column(Float, nullable=True)     # 最大回撤%
    fit_rate = Column(Float, nullable=True)             # 符合度%
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
