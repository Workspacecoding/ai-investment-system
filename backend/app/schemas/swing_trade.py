from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class SwingTradeSetupResponse(BaseModel):
    id: int
    asset_id: int
    trade_date: date
    current_price: float
    entry_zone_low: float
    entry_zone_high: float
    add_zone_1: float
    add_zone_2: float
    stop_loss_price: float
    target_price_1: float
    target_price_2: float
    expected_holding_days: int
    swing_score: float
    confidence_level: str
    setup_type: str
    reason: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
