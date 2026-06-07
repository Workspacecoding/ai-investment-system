from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class AssetScoreCreate(BaseModel):
    asset_id: int
    trade_date: date
    market_score: float
    industry_score: float
    factor_score: float
    price_level_score: float
    final_score: float
    rating: str


class AssetScoreResponse(BaseModel):
    id: int
    asset_id: int
    trade_date: date
    market_score: float
    industry_score: float
    factor_score: float
    price_level_score: float
    final_score: float
    rating: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
