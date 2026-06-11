from sqlalchemy import BigInteger, Column, Date, DateTime, Float, String, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class IndicatorDailyValue(Base):
    """Admin-entered normalized indicator scores (0-100) per market per day."""
    __tablename__ = "indicator_daily_values"
    __table_args__ = (UniqueConstraint("record_date", "market_code", "field_key", name="uq_indicator_daily"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    record_date = Column(Date, nullable=False)
    market_code = Column(String(20), nullable=False)
    field_key = Column(String(80), nullable=False)
    display_name = Column(String(100), nullable=False)
    score = Column(Float, nullable=False)       # normalized 0-100
    raw_value = Column(Float, nullable=True)    # optional raw value (e.g. NASDAQ level)
    notes = Column(String(200), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
