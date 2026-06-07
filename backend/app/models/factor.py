from sqlalchemy import BigInteger, Column, Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class FactorScore(Base):
    __tablename__ = "factor_scores"
    __table_args__ = (
        UniqueConstraint(
            "asset_id",
            "trade_date",
            "factor_name",
            name="uq_factor_score_asset_date_name",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    trade_date = Column(Date, nullable=False)
    factor_name = Column(String(100), nullable=False)
    factor_type = Column(String(50), nullable=False)
    factor_value = Column(Numeric(18, 4), nullable=False)
    factor_score = Column(Numeric(10, 4), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
