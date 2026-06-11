from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class MarketConfigIndicatorLink(Base):
    __tablename__ = "market_config_indicator_links"
    __table_args__ = (
        UniqueConstraint("market_config_id", "indicator_config_id", name="uq_mkt_cfg_ind_link"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    market_config_id = Column(BigInteger, ForeignKey("market_configs.id"), nullable=False)
    indicator_config_id = Column(BigInteger, ForeignKey("market_indicator_configs.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
