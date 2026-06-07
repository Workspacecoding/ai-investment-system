from sqlalchemy import BigInteger, Boolean, Column, Date, DateTime, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class TechnicalIndicator(Base):
    __tablename__ = "technical_indicators"
    __table_args__ = (
        UniqueConstraint("asset_id", "trade_date", name="uq_technical_indicator_date"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    trade_date = Column(Date, nullable=False)
    ma5 = Column(Numeric(18, 4))
    ma10 = Column(Numeric(18, 4))
    ma20 = Column(Numeric(18, 4))
    ma60 = Column(Numeric(18, 4))
    rsi14 = Column(Numeric(10, 4))
    volume_ma5 = Column(Numeric(18, 4))
    volume_ratio = Column(Numeric(10, 4))
    change_percent = Column(Numeric(10, 4))
    is_uptrend = Column(Boolean, nullable=False, default=False)
    is_overbought = Column(Boolean, nullable=False, default=False)
    is_volume_spike = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
