from sqlalchemy import BigInteger, Column, DateTime, Float, ForeignKey, JSON, String, Text
from sqlalchemy.sql import func

from app.database import Base


class FactorCorrReport(Base):
    __tablename__ = "factor_corr_reports"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    report_month = Column(String(7), nullable=False)          # "2026-06"
    formula_type = Column(String(50), nullable=False)         # "market_score", "tw_stock", …
    market_score_actual_corr = Column(Float, nullable=True)   # market score vs real performance
    # [{field_key, display_name, weight, corr_score}]
    factor_entries = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class StockCorrEntry(Base):
    __tablename__ = "stock_corr_entries"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    report_id = Column(BigInteger, ForeignKey("factor_corr_reports.id"), nullable=False)
    asset_id = Column(BigInteger, nullable=True)
    symbol = Column(String(20), nullable=False)
    name = Column(String(200), nullable=True)
    total_score_actual_corr = Column(Float, nullable=True)    # stock total score vs actual price
    # [{field_key, display_name, weight, corr_score}]
    indicator_weights = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
