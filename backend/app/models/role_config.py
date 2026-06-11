from sqlalchemy import BigInteger, Boolean, Column, DateTime, JSON, String, Text
from sqlalchemy.sql import func

from app.database import Base


class RoleConfig(Base):
    __tablename__ = "role_configs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)
    label = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    features = Column(JSON, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
