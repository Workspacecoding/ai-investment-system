from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class MarketSnapshotCreate(BaseModel):
    snapshot_date: date
    nasdaq_change_percent: float
    sp500_change_percent: float
    twii_change_percent: float
    vix_value: float
    us10y_value: float


class MarketSnapshotResponse(BaseModel):
    id: int
    snapshot_date: date
    nasdaq_change_percent: float
    sp500_change_percent: float
    twii_change_percent: float
    vix_value: float
    us10y_value: float
    market_score: float
    market_regime: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
