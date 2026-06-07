from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class TradePlanCreate(BaseModel):
    asset_id: int
    trade_date: date
    final_score: float
    rating: str
    action: str
    current_price: float
    entry_price: float | None = None
    stop_loss_price: float
    take_profit_1: float
    take_profit_2: float
    expected_return_percent: float
    max_loss_percent: float
    risk_reward_ratio: float
    strategy_type: str
    reason: str


class TradePlanResponse(BaseModel):
    id: int
    asset_id: int
    trade_date: date
    final_score: float
    rating: str
    action: str
    current_price: float
    entry_price: float | None = None
    stop_loss_price: float
    take_profit_1: float
    take_profit_2: float
    expected_return_percent: float
    max_loss_percent: float
    risk_reward_ratio: float
    strategy_type: str
    reason: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
