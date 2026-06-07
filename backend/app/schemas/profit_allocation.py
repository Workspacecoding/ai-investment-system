from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProfitAllocationGenerateRequest(BaseModel):
    portfolio_id: int
    realized_profit: float = Field(gt=0)


class ProfitAllocationResponse(BaseModel):
    id: int
    user_id: int
    portfolio_id: int
    realized_profit: float
    entertainment_amount: float
    reinvest_amount: float
    cash_amount: float
    core_asset_amount: float
    entertainment_ratio: float
    reinvest_ratio: float
    cash_ratio: float
    core_asset_ratio: float
    allocation_version: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProfitAllocationRecommendationResponse(BaseModel):
    id: int
    allocation_id: int
    asset_id: int
    recommendation_type: str
    allocation_amount: float
    reason: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
