from sqlalchemy import BigInteger, Column, DateTime, Float, String, Text
from sqlalchemy.sql import func

from app.database import Base


class ModelValidationRecord(Base):
    __tablename__ = "model_validation_records"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    model_id = Column(BigInteger, nullable=False, index=True)
    validation_indicator_id = Column(BigInteger, nullable=True)   # 驗證指標 id
    validation_indicator_name = Column(String(200), nullable=True)  # 驗證指標名稱
    model_score = Column(Float, nullable=True)        # 模型分數（來源公式管理）
    validation_asset = Column(String(100), nullable=True)  # 驗證標的
    asset_value = Column(Float, nullable=True)        # 標的數值
    price_change_pct = Column(Float, nullable=True)   # 上升下降%
    validation_conditions = Column(Text, nullable=True)  # 保留相容
    fit_rate = Column(Float, nullable=True)           # 符合度%
    record_date = Column(String(10), nullable=True)   # YYYY-MM-DD
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
