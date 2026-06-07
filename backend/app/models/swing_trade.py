from sqlalchemy import BigInteger, Column, Date, DateTime, Enum, ForeignKey, Integer, Numeric, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class SwingTradeSetup(Base):
    __tablename__ = "swing_trade_setups"
    __table_args__ = (
        UniqueConstraint("asset_id", "trade_date", name="uq_swing_trade_setup_asset_date"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    trade_date = Column(Date, nullable=False)
    current_price = Column(Numeric(18, 4), nullable=False)
    entry_zone_low = Column(Numeric(18, 4), nullable=False)
    entry_zone_high = Column(Numeric(18, 4), nullable=False)
    add_zone_1 = Column(Numeric(18, 4), nullable=False)
    add_zone_2 = Column(Numeric(18, 4), nullable=False)
    stop_loss_price = Column(Numeric(18, 4), nullable=False)
    target_price_1 = Column(Numeric(18, 4), nullable=False)
    target_price_2 = Column(Numeric(18, 4), nullable=False)
    expected_holding_days = Column(Integer, nullable=False)
    swing_score = Column(Numeric(10, 4), nullable=False)
    confidence_level = Column(Enum("low", "medium", "high"), nullable=False)
    setup_type = Column(
        Enum("pullback", "breakout", "trend_follow", "mean_reversion"),
        nullable=False,
    )
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
