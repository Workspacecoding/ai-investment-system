from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class MarketIndicatorConfig(Base):
    """Controls which market indicators appear on the dashboard and stores formula docs."""
    __tablename__ = "market_indicator_configs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    # Matches a field in MarketSnapshot, e.g. "twii_change_percent"
    field_key = Column(String(80), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)   # 加權指數漲跌幅
    unit = Column(String(20), nullable=False, default="%")  # %, 點, 分
    description = Column(Text, nullable=True)
    formula = Column(Text, nullable=True)                # How this value is computed
    is_active = Column(Boolean, nullable=False, default=True)
    display_order = Column(Integer, nullable=False, default=0)
    api_config_id = Column(BigInteger, nullable=True)
    api_source = Column(String(100), nullable=True)
    indicator_category = Column(String(30), nullable=True)  # technical / fundamental / chips
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TrackedIndustry(Base):
    """Industries pinned to the dashboard industry panel."""
    __tablename__ = "tracked_industries"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    industry_id = Column(BigInteger, nullable=False, unique=True)
    created_at = Column(DateTime, server_default=func.now())
