from sqlalchemy import BigInteger, Column, Date, DateTime, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class AssetPrice(Base):
    __tablename__ = "asset_prices"
    __table_args__ = (
        UniqueConstraint("asset_id", "trade_date", name="uq_asset_price_date"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    trade_date = Column(Date, nullable=False)
    open_price = Column(Numeric(18, 4), nullable=False)
    high_price = Column(Numeric(18, 4), nullable=False)
    low_price = Column(Numeric(18, 4), nullable=False)
    close_price = Column(Numeric(18, 4), nullable=False)
    volume = Column(BigInteger, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
