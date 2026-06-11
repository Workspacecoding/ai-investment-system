from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MarketIndicatorConfigCreate(BaseModel):
    field_key: str
    display_name: str
    unit: str = "%"
    description: str | None = None
    formula: str | None = None
    is_active: bool = True
    display_order: int = 0


class MarketIndicatorConfigUpdate(BaseModel):
    display_name: str | None = None
    unit: str | None = None
    description: str | None = None
    formula: str | None = None
    is_active: bool | None = None
    display_order: int | None = None
    api_config_id: int | None = None
    api_source: str | None = None


class MarketIndicatorConfigResponse(BaseModel):
    id: int
    field_key: str
    display_name: str
    unit: str
    description: str | None
    formula: str | None
    is_active: bool
    display_order: int
    api_config_id: int | None = None
    api_source: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TrackedIndustryResponse(BaseModel):
    id: int
    industry_id: int
    industry_name: str
    industry_code: str
    market: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
