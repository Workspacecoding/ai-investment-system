from datetime import datetime, time

from pydantic import BaseModel, ConfigDict


class NotificationSettingUpdate(BaseModel):
    email_enabled: bool | None = None
    email_address: str | None = None
    buy_signal_enabled: bool | None = None
    take_profit_enabled: bool | None = None
    stop_loss_enabled: bool | None = None
    score_change_enabled: bool | None = None
    market_change_enabled: bool | None = None
    weekly_report_enabled: bool | None = None
    monthly_report_enabled: bool | None = None
    daily_send_time: time | None = None
    timezone: str | None = None


class NotificationSettingResponse(BaseModel):
    id: int
    user_id: int
    email_enabled: bool
    email_address: str | None = None
    buy_signal_enabled: bool
    take_profit_enabled: bool
    stop_loss_enabled: bool
    score_change_enabled: bool
    market_change_enabled: bool
    weekly_report_enabled: bool
    monthly_report_enabled: bool
    daily_send_time: time
    timezone: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class NotificationLogResponse(BaseModel):
    id: int
    user_id: int
    asset_id: int | None = None
    notification_type: str
    subject: str
    body: str
    status: str
    error_message: str | None = None
    scheduled_at: datetime | None = None
    sent_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
