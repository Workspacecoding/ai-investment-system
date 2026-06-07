from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    Time,
)
from sqlalchemy.sql import func

from app.database import Base


class NotificationSetting(Base):
    __tablename__ = "notification_settings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), unique=True, nullable=False)
    email_enabled = Column(Boolean, nullable=False, default=True)
    email_address = Column(String(255), nullable=True)
    buy_signal_enabled = Column(Boolean, nullable=False, default=True)
    take_profit_enabled = Column(Boolean, nullable=False, default=True)
    stop_loss_enabled = Column(Boolean, nullable=False, default=True)
    score_change_enabled = Column(Boolean, nullable=False, default=True)
    market_change_enabled = Column(Boolean, nullable=False, default=True)
    weekly_report_enabled = Column(Boolean, nullable=False, default=True)
    monthly_report_enabled = Column(Boolean, nullable=False, default=True)
    daily_send_time = Column(Time, nullable=False, server_default="08:00:00")
    timezone = Column(String(100), nullable=False, default="Asia/Taipei")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=True)
    notification_type = Column(
        Enum(
            "buy_signal",
            "take_profit",
            "stop_loss",
            "score_change",
            "market_change",
            "weekly_report",
            "monthly_report",
        ),
        nullable=False,
    )
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)
    status = Column(Enum("pending", "sent", "failed"), nullable=False, default="pending")
    error_message = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
