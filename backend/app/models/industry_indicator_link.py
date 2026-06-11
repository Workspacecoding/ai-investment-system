from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class IndustryIndicatorLink(Base):
    __tablename__ = "industry_indicator_links"
    __table_args__ = (
        UniqueConstraint("industry_id", "indicator_config_id", name="uq_ind_link"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    industry_id = Column(BigInteger, ForeignKey("industries.id"), nullable=False)
    indicator_config_id = Column(BigInteger, ForeignKey("market_indicator_configs.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
