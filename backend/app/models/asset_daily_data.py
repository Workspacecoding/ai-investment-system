from sqlalchemy import BigInteger, Column, Date, DateTime, Float, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class AssetDailyData(Base):
    """Per-asset daily indicator values crawled or manually entered."""
    __tablename__ = "asset_daily_data"
    __table_args__ = (
        UniqueConstraint("asset_id", "record_date", "field_key", name="uq_asset_daily_data"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, nullable=False, index=True)
    record_date = Column(Date, nullable=False)
    field_key = Column(String(80), nullable=False)
    display_name = Column(String(100), nullable=False)
    category = Column(String(30), nullable=True)   # fundamental / technical / chips
    value = Column(Float, nullable=True)
    raw_text = Column(Text, nullable=True)          # original string value if non-numeric
    source = Column(String(50), nullable=True)      # crawler / manual
    notes = Column(String(200), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
