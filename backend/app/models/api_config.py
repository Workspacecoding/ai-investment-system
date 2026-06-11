from sqlalchemy import JSON, BigInteger, Boolean, Column, DateTime, String, Text
from sqlalchemy.sql import func

from app.database import Base


class ApiConfig(Base):
    """External API configurations for crawlers and data providers."""
    __tablename__ = "api_configs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    code = Column(String(80), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    base_url = Column(String(500), nullable=True)
    api_key = Column(String(500), nullable=True)
    extra_params = Column(JSON, nullable=True)
    headers = Column(JSON, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    crawl_enabled = Column(Boolean, nullable=False, default=False)
    crawl_time = Column(String(10), nullable=True)   # e.g. "08:00"
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
