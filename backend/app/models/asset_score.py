from sqlalchemy import BigInteger, Column, Date, DateTime, Enum, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class AssetScore(Base):
    __tablename__ = "asset_scores"
    __table_args__ = (
        UniqueConstraint("asset_id", "trade_date", name="uq_asset_score_date"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    trade_date = Column(Date, nullable=False)
    market_score = Column(Numeric(10, 4), nullable=False)
    industry_score = Column(Numeric(10, 4), nullable=False)
    factor_score = Column(Numeric(10, 4), nullable=False)
    price_level_score = Column(Numeric(10, 4), nullable=False)
    final_score = Column(Numeric(10, 4), nullable=False)
    rating = Column(
        Enum("strong_buy", "buy", "watch", "weak", "avoid"),
        nullable=False,
    )
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
