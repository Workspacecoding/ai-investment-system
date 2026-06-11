from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class MarketConfig(Base):
    __tablename__ = "market_configs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    code = Column(String(20), unique=True, nullable=False)   # e.g. "TW", "US"
    name = Column(String(100), nullable=False)               # e.g. "台灣股市"
    currency = Column(String(10), nullable=False)            # e.g. "TWD"
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    is_tracked = Column(Boolean, nullable=False, default=False)
    display_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
