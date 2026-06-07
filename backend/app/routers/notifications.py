from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.notifications import (
    NotificationLogResponse,
    NotificationSettingResponse,
    NotificationSettingUpdate,
)
from app.services.notification_rule_service import check_all_notification_rules
from app.services.notification_service import (
    get_notification_log_or_404,
    get_or_create_notification_settings,
    list_notification_logs,
    send_email_notification,
    update_notification_settings,
)
from app.services.report_notification_service import (
    generate_monthly_report_notification,
    generate_weekly_report_notification,
)


router = APIRouter(prefix="/notifications")


@router.get("/settings", response_model=NotificationSettingResponse)
def get_notification_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_or_create_notification_settings(db, current_user.id)


@router.put("/settings", response_model=NotificationSettingResponse)
def put_notification_settings(
    payload: NotificationSettingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_notification_settings(db, current_user.id, payload)


@router.get("/logs", response_model=list[NotificationLogResponse])
def get_notification_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_notification_logs(db, current_user.id)


@router.get("/logs/{log_id}", response_model=NotificationLogResponse)
def get_notification_log(
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_notification_log_or_404(db, current_user.id, log_id)


@router.post("/check", response_model=list[NotificationLogResponse])
def post_check_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return check_all_notification_rules(db, current_user.id)


@router.post("/weekly-report", response_model=NotificationLogResponse)
def post_weekly_report_notification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = generate_weekly_report_notification(db, current_user.id)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Weekly report notification is disabled",
        )
    return log


@router.post("/monthly-report", response_model=NotificationLogResponse)
def post_monthly_report_notification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = generate_monthly_report_notification(db, current_user.id)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Monthly report notification is disabled",
        )
    return log


@router.post("/logs/{log_id}/send", response_model=NotificationLogResponse)
def post_send_notification_log(
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return send_email_notification(db, current_user.id, log_id)
