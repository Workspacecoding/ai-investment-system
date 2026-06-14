from sqlalchemy import BigInteger, Boolean, Column, DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.sql import func

from app.database import Base


class DataUpdateTask(Base):
    __tablename__ = "data_update_tasks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=True)
    indicator_ids = Column(JSON, nullable=False, default=list)
    target_type = Column(String(20), nullable=False, default="all")  # single|multiple|industry|market|all
    target_ids = Column(JSON, nullable=True)                         # asset/industry/market ids
    update_mode = Column(String(20), nullable=False, default="manual")  # manual|auto
    data_mode = Column(String(20), nullable=False, default="incremental")  # full|incremental|backfill
    start_date = Column(String(10), nullable=True)
    end_date = Column(String(10), nullable=True)
    auto_frequency = Column(String(20), nullable=True)  # daily|weekly|monthly|custom
    cron_expr = Column(String(100), nullable=True)
    skip_existing = Column(Boolean, nullable=False, default=True)
    overwrite = Column(Boolean, nullable=False, default=False)
    retry_on_fail = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class DataUpdateLog(Base):
    __tablename__ = "data_update_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    task_id = Column(BigInteger, nullable=True)
    executed_at = Column(DateTime, server_default=func.now())
    indicator_ids = Column(JSON, nullable=True)
    target_count = Column(Integer, nullable=False, default=0)
    added_count = Column(Integer, nullable=False, default=0)
    updated_count = Column(Integer, nullable=False, default=0)
    failed_count = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="running")  # running|success|failed
    error_message = Column(Text, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    completed_at = Column(DateTime, nullable=True)
