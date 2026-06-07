from datetime import datetime, time

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.notification import NotificationLog, NotificationSetting
from app.models.user import User
from app.schemas.notifications import NotificationSettingUpdate


def get_or_create_notification_settings(
    db: Session,
    user_id: int,
) -> NotificationSetting:
    setting = (
        db.query(NotificationSetting)
        .filter(NotificationSetting.user_id == user_id)
        .first()
    )
    if setting:
        return setting

    user = db.query(User).filter(User.id == user_id).first()
    setting = NotificationSetting(
        user_id=user_id,
        email_enabled=True,
        email_address=user.email if user else None,
        buy_signal_enabled=True,
        take_profit_enabled=True,
        stop_loss_enabled=True,
        score_change_enabled=True,
        market_change_enabled=True,
        weekly_report_enabled=True,
        monthly_report_enabled=True,
        daily_send_time=time(8, 0, 0),
        timezone="Asia/Taipei",
    )
    db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


def update_notification_settings(
    db: Session,
    user_id: int,
    payload: NotificationSettingUpdate,
) -> NotificationSetting:
    setting = get_or_create_notification_settings(db, user_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(setting, field, value)
    db.commit()
    db.refresh(setting)
    return setting


def create_notification_log(
    db: Session,
    user_id: int,
    notification_type: str,
    subject: str,
    body: str,
    asset_id: int | None = None,
    scheduled_at: datetime | None = None,
) -> NotificationLog:
    log = NotificationLog(
        user_id=user_id,
        asset_id=asset_id,
        notification_type=notification_type,
        subject=subject,
        body=body,
        status="pending",
        scheduled_at=scheduled_at,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_notification_log_or_404(
    db: Session,
    user_id: int,
    log_id: int,
) -> NotificationLog:
    log = (
        db.query(NotificationLog)
        .filter(NotificationLog.id == log_id, NotificationLog.user_id == user_id)
        .first()
    )
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification log not found",
        )
    return log


def list_notification_logs(db: Session, user_id: int) -> list[NotificationLog]:
    return (
        db.query(NotificationLog)
        .filter(NotificationLog.user_id == user_id)
        .order_by(NotificationLog.created_at.desc(), NotificationLog.id.desc())
        .all()
    )


def send_email_notification(
    db: Session,
    user_id: int,
    notification_log_id: int,
) -> NotificationLog:
    log = get_notification_log_or_404(db, user_id, notification_log_id)
    setting = get_or_create_notification_settings(db, user_id)
    try:
        if not setting.email_enabled:
            raise RuntimeError("Email notification is disabled")
        if not setting.email_address:
            raise RuntimeError("Email address is not configured")
        log.status = "sent"
        log.sent_at = datetime.utcnow()
        log.error_message = None
    except Exception as exc:
        log.status = "failed"
        log.error_message = str(exc)
    db.commit()
    db.refresh(log)
    return log
