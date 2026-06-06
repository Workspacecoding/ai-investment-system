from sqlalchemy import BigInteger, Boolean, Column, DateTime, Float, ForeignKey, String
from sqlalchemy.sql import func

from app.database import Base


class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), unique=True, nullable=False)
    strategy_enabled = Column(Boolean, nullable=False, default=True)
    allow_crypto = Column(Boolean, nullable=False, default=False)
    allow_penny_stock = Column(Boolean, nullable=False, default=False)
    risk_level = Column(String(50), nullable=False, default="balanced")
    max_drawdown = Column(Float, nullable=False, default=0.2)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
