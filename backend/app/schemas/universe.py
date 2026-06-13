from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class AssetCreate(BaseModel):
    symbol: str
    name: str
    market: str
    asset_type: str
    industry_id: int | None = None
    api_config_id: int | None = None
    api_code: str | None = None
    description: str | None = None
    currency: str
    update_frequency: str | None = None
    in_swing_pool: bool = False
    in_newsletter: bool = False
    needs_backtest: bool = False
    is_penny_stock: bool = False
    is_active: bool = True


class AssetResponse(BaseModel):
    id: int
    symbol: str
    name: str
    market: str
    asset_type: str
    industry_id: int | None = None
    api_config_id: int | None = None
    api_code: str | None = None
    description: str | None = None
    currency: str
    update_frequency: str | None = None
    in_swing_pool: bool = False
    in_newsletter: bool = False
    needs_backtest: bool = False
    is_penny_stock: bool
    is_active: bool
    data_sync_enabled: bool = False
    last_price_synced_at: datetime | None = None
    current_model_id: int | None = None
    position_model_id: int | None = None
    analysis_model_id: int | None = None
    crawler_enabled: bool = False
    crawler_start_time: datetime | None = None
    crawler_stop_time: datetime | None = None
    crawler_indicator_ids: list[int] | None = None
    crawler_years: int = 10
    module_calc_indicator_ids: list[int] | None = None
    module_validation_asset_ids: list[int] | None = None
    module_validation_indicator_ids: list[int] | None = None
    module_validation_period_days: int | None = None
    module_result_indicator_ids: list[int] | None = None
    module_formula_expr: str | None = None
    module_validation_conditions: str | None = None
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
    is_sync_enabled: bool = False
    sync_start_date: date | None = None
    sync_end_date: date | None = None
    last_synced_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WatchlistSyncResponse(WatchlistResponse):
    inserted_count: int
    skipped_duplicate_count: int
    warning_count: int
    start_date: date
    end_date: date


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
