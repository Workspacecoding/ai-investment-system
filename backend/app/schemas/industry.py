from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class IndustryCreate(BaseModel):
    industry_code: str
    industry_name: str
    market: str
    description: str | None = None


class IndustryResponse(BaseModel):
    id: int
    industry_code: str
    industry_name: str
    market: str
    description: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IndustryMomentumCreate(BaseModel):
    snapshot_date: date
    avg_return_1m: float
    avg_return_3m: float
    avg_return_6m: float
    volume_score: float
    trend_score: float
    sentiment_score: float


class IndustryMomentumResponse(BaseModel):
    id: int
    industry_id: int
    snapshot_date: date
    avg_return_1m: float
    avg_return_3m: float
    avg_return_6m: float
    volume_score: float
    trend_score: float
    sentiment_score: float
    momentum_score: float
    ranking: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
