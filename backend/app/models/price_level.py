from sqlalchemy import BigInteger, Column, Date, DateTime, Enum, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class PriceLevel(Base):
    __tablename__ = "price_levels"
    __table_args__ = (
        UniqueConstraint("asset_id", "trade_date", name="uq_price_level_asset_date"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    trade_date = Column(Date, nullable=False)
    current_price = Column(Numeric(18, 4), nullable=False)
    high_52w = Column(Numeric(18, 4), nullable=False)
    low_52w = Column(Numeric(18, 4), nullable=False)
    percentile_52w = Column(Numeric(10, 4), nullable=False)
    high_all_time = Column(Numeric(18, 4), nullable=False)
    low_all_time = Column(Numeric(18, 4), nullable=False)
    percentile_all_time = Column(Numeric(10, 4), nullable=False)
    level_52w = Column(
        Enum("very_low", "low", "normal", "high", "very_high"),
        nullable=False,
    )
    level_all_time = Column(
        Enum("very_low", "low", "normal", "high", "very_high"),
        nullable=False,
    )
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
