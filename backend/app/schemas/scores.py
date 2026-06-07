from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class AssetScoreCreate(BaseModel):
    asset_id: int
    trade_date: date
    market_score: float
    industry_score: float
    factor_score: float
    price_level_score: float
    fundamental_score: float | None = None
    sentiment_score: float | None = None
    industry_momentum_version: str | None = None
    final_score: float
    rating: str
    scoring_version: str = "v2"


class AssetScoreResponse(BaseModel):
    id: int
    asset_id: int
    trade_date: date
    market_score: float
    industry_score: float
    factor_score: float
    price_level_score: float
    fundamental_score: float | None = None
    sentiment_score: float | None = None
    industry_momentum_version: str | None = None
    final_score: float
    rating: str
    scoring_version: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
