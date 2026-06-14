from sqlalchemy import BigInteger, Column, DateTime, Float, Integer, Numeric, String, Text
from sqlalchemy.sql import func

from app.database import Base


class StrategyPosition(Base):
    __tablename__ = "strategy_positions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, nullable=False)
    asset_symbol = Column(String(30), nullable=False)
    center_price = Column(Numeric(18, 4), nullable=False)
    current_price = Column(Numeric(18, 4), nullable=True)
    method = Column(String(100), nullable=True)          # how center_price was calculated
    # Zone percentages (stored as signed numbers, e.g. -15, -10, -5, 0, 10, 20, 30)
    strong_buy_pct = Column(Float, nullable=False, default=-15.0)
    buy_pct = Column(Float, nullable=False, default=-10.0)
    watch_pct = Column(Float, nullable=False, default=-5.0)
    sell_1_pct = Column(Float, nullable=False, default=10.0)
    sell_2_pct = Column(Float, nullable=False, default=20.0)
    sell_3_pct = Column(Float, nullable=False, default=30.0)
    status = Column(String(20), nullable=False, default="active")  # active|testing|disabled
    notes = Column(Text, nullable=True)
    updated_date = Column(String(10), nullable=True)    # YYYY-MM-DD
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class StrategyPositionValidation(Base):
    __tablename__ = "strategy_position_validations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    position_id = Column(BigInteger, nullable=False)
    validation_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    # model / indicator reference
    analysis_model_id = Column(BigInteger, nullable=True)
    analysis_model_name = Column(String(200), nullable=True)
    validation_indicator_id = Column(BigInteger, nullable=True)
    validation_indicator_name = Column(String(200), nullable=True)
    model_score = Column(Float, nullable=True)             # 模型分數
    # price action
    buy_zone = Column(String(50), nullable=True)           # e.g. "買進區"
    buy_price = Column(Numeric(18, 4), nullable=True)
    sell_zone = Column(String(50), nullable=True)          # e.g. "第一賣點"
    sell_price = Column(Numeric(18, 4), nullable=True)
    holding_days = Column(Integer, nullable=True)          # 持有天數
    return_pct = Column(Float, nullable=True)
    fit_rate = Column(Float, nullable=True)                # 符合度%
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
