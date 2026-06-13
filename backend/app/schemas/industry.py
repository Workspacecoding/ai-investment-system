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
    tracking_status: str = "disabled"  # "core" | "observation" | "disabled"
    current_model_id: int | None = None
    module_calc_indicator_ids: list[int] | None = None
    module_validation_asset_ids: list[int] | None = None
    module_validation_indicator_ids: list[int] | None = None
    module_validation_period_days: int | None = None
    module_result_indicator_ids: list[int] | None = None
    module_formula_expr: str | None = None
    module_validation_conditions: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IndustryMomentumCreate(BaseModel):
    snapshot_date: date
    avg_return_1m: float
    avg_return_3m: float
    avg_return_6m: float
    volume_score: float
    trend_score: float
    sentiment_score: float | None = None


class IndustryMomentumResponse(BaseModel):
    id: int
    industry_id: int
    snapshot_date: date
    avg_return_1m: float
    avg_return_3m: float
    avg_return_6m: float
    volume_score: float
    trend_score: float
    sentiment_score: float | None = None
    momentum_score: float
    momentum_version: str
    ranking: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
