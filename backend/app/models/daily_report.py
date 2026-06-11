from sqlalchemy import BigInteger, Column, Date, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class DailyReport(Base):
    __tablename__ = "daily_reports"
    __table_args__ = (
        UniqueConstraint("user_id", "report_date", name="uq_daily_report_user_date"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    report_date = Column(Date, nullable=False)
    market_state = Column(String(50), nullable=True)
    market_score = Column(Numeric(10, 2), nullable=True)
    top_industry = Column(String(100), nullable=True)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class DailyReportItem(Base):
    __tablename__ = "daily_report_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    daily_report_id = Column(BigInteger, ForeignKey("daily_reports.id"), nullable=False)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    action = Column(String(50), nullable=True)
    score = Column(Numeric(10, 2), nullable=True)
    swing_score = Column(Numeric(10, 2), nullable=True)
    confidence = Column(String(20), nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
