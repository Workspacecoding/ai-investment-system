import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User
from app.services.daily_report_service import generate_daily_report
from app.services.report_notification_service import generate_daily_report_email

logger = logging.getLogger(__name__)


def run_daily_report_for_user(db: Session, user_id: int) -> dict:
    result = {"user_id": user_id, "report": None, "notification": None, "error": None}
    try:
        report = generate_daily_report(db, user_id)
        result["report"] = report.id
    except Exception as exc:
        logger.warning("generate_daily_report failed for user_id=%s: %s", user_id, exc)
        result["error"] = str(exc)

    try:
        notification = generate_daily_report_email(db, user_id)
        result["notification"] = notification.id if notification else None
    except Exception as exc:
        logger.warning("generate_daily_report_email failed for user_id=%s: %s", user_id, exc)
        if not result["error"]:
            result["error"] = str(exc)

    return result


def run_daily_report_scheduler() -> list[dict]:
    """
    Run at 08:00 daily.
    Generates daily report and sends email notification for all active users.
    """
    logger.info("Daily report scheduler started at %s", datetime.utcnow().isoformat())
    db: Session = SessionLocal()
    results = []
    try:
        users = db.query(User).filter(User.is_active.is_(True)).all()
        for user in users:
            result = run_daily_report_for_user(db, user.id)
            results.append(result)
            logger.info(
                "Daily report done for user_id=%s report_id=%s notification_id=%s",
                user.id,
                result.get("report"),
                result.get("notification"),
            )
    finally:
        db.close()

    logger.info("Daily report scheduler finished. Processed %d users.", len(results))
    return results
