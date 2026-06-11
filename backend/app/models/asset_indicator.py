from sqlalchemy import BigInteger, Column, DateTime, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class AssetIndicatorLink(Base):
    """Links an asset (stock/etf/crypto) to market indicator configs for display/analysis."""
    __tablename__ = "asset_indicator_links"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, nullable=False)
    indicator_config_id = Column(BigInteger, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (UniqueConstraint("asset_id", "indicator_config_id", name="uq_asset_indicator"),)
