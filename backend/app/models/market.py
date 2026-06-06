from sqlalchemy import BigInteger, Column, Date, DateTime, Enum, Numeric
from sqlalchemy.sql import func

from app.database import Base


class MarketSnapshot(Base):
    __tablename__ = "market_snapshots"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    snapshot_date = Column(Date, unique=True, nullable=False)
    nasdaq_change_percent = Column(Numeric(10, 4), nullable=False)
    sp500_change_percent = Column(Numeric(10, 4), nullable=False)
    twii_change_percent = Column(Numeric(10, 4), nullable=False)
    vix_value = Column(Numeric(10, 4), nullable=False)
    us10y_value = Column(Numeric(10, 4), nullable=False)
    market_score = Column(Numeric(10, 4), nullable=False)
    market_regime = Column(Enum("bull", "sideways", "bear"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
