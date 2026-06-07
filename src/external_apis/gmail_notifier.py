from __future__ import annotations

import logging
import os
import smtplib
from email.message import EmailMessage

from dotenv import load_dotenv


logger = logging.getLogger(__name__)

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 465


def send_email(subject: str, body: str, to_email: str | None = None) -> bool:
    """Send an email through Gmail SMTP.

    Requires GMAIL_USER, GMAIL_APP_PASSWORD, and EMAIL_RECEIVER or to_email.
    Returns False on configuration or SMTP failures instead of raising.
    """
    load_dotenv()
    gmail_user = os.getenv("GMAIL_USER")
    gmail_app_password = os.getenv("GMAIL_APP_PASSWORD")
    receiver = to_email or os.getenv("EMAIL_RECEIVER")

    if not gmail_user or not gmail_app_password or not receiver:
        logger.warning("Gmail SMTP configuration is incomplete; email not sent")
        return False

    try:
        message = EmailMessage()
        message["From"] = gmail_user
        message["To"] = receiver
        message["Subject"] = subject
        message.set_content(body)

        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
            smtp.login(gmail_user, gmail_app_password)
            smtp.send_message(message)
        return True
    except Exception as exc:
        logger.exception("Failed to send Gmail notification: %s", exc)
        return False
