from sqlalchemy import (
    BigInteger,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.database import Base


class Industry(Base):
    __tablename__ = "industries"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    industry_code = Column(String(50), unique=True, nullable=False)
    industry_name = Column(String(255), nullable=False)
    market = Column(String(50), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )


class IndustryMomentum(Base):
    __tablename__ = "industry_momentum"
    __table_args__ = (
        UniqueConstraint("industry_id", "snapshot_date", name="uq_industry_momentum_date"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    industry_id = Column(BigInteger, ForeignKey("industries.id"), nullable=False)
    snapshot_date = Column(Date, nullable=False)
    avg_return_1m = Column(Float, nullable=False)
    avg_return_3m = Column(Float, nullable=False)
    avg_return_6m = Column(Float, nullable=False)
    volume_score = Column(Float, nullable=False)
    trend_score = Column(Float, nullable=False)
    sentiment_score = Column(Float, nullable=False)
    momentum_score = Column(Float, nullable=False)
    ranking = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
