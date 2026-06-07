from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class PriceLevelResponse(BaseModel):
    id: int
    asset_id: int
    trade_date: date
    current_price: float
    high_52w: float
    low_52w: float
    percentile_52w: float
    high_all_time: float
    low_all_time: float
    percentile_all_time: float
    level_52w: str
    level_all_time: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
