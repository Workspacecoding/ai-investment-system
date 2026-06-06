from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class AssetCreate(BaseModel):
    symbol: str
    name: str
    market: str
    asset_type: str
    industry_id: int | None = None
    currency: str
    is_penny_stock: bool = False
    is_active: bool = True


class AssetResponse(BaseModel):
    id: int
    symbol: str
    name: str
    market: str
    asset_type: str
    industry_id: int | None = None
    currency: str
    is_penny_stock: bool
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WatchlistCreate(BaseModel):
    asset_id: int
    note: str | None = None


class WatchlistResponse(BaseModel):
    id: int
    user_id: int
    asset_id: int
    note: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecommendedAssetCreate(BaseModel):
    asset_id: int
    recommendation_date: date
    source: str
    reason: str | None = None
    score: float


class RecommendedAssetResponse(BaseModel):
    id: int
    asset_id: int
    recommendation_date: date
    source: str
    reason: str | None = None
    score: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
