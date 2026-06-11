from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class AssetRole(Base):
    __tablename__ = "asset_roles"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=False, unique=True)
    applicable_types = Column(JSON, nullable=True)  # e.g. ["stock", "etf"]
    description = Column(Text, nullable=True)
    color = Column(String(20), nullable=True)  # hex like "#6366f1"
    display_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
