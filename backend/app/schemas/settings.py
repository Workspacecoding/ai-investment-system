from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserSettingUpdate(BaseModel):
    strategy_enabled: bool | None = None
    allow_crypto: bool | None = None
    allow_penny_stock: bool | None = None
    risk_level: str | None = None
    max_drawdown: float | None = None


class UserSettingResponse(BaseModel):
    id: int
    user_id: int
    strategy_enabled: bool
    allow_crypto: bool
    allow_penny_stock: bool
    risk_level: str
    max_drawdown: float
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
