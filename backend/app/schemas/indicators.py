from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class AssetPriceCreate(BaseModel):
    trade_date: date
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    volume: int


class AssetPriceResponse(BaseModel):
    id: int
    asset_id: int
    trade_date: date
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    volume: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TechnicalIndicatorResponse(BaseModel):
    id: int
    asset_id: int
    trade_date: date
    ma5: float | None = None
    ma10: float | None = None
    ma20: float | None = None
    ma60: float | None = None
    rsi14: float | None = None
    volume_ma5: float | None = None
    volume_ratio: float | None = None
    change_percent: float | None = None
    is_uptrend: bool
    is_overbought: bool
    is_volume_spike: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FactorScoreCreate(BaseModel):
    trade_date: date
    factor_name: str
    factor_type: str
    factor_value: float
    factor_score: float


class FactorScoreResponse(BaseModel):
    id: int
    asset_id: int
    trade_date: date
    factor_name: str
    factor_type: str
    factor_value: float
    factor_score: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
