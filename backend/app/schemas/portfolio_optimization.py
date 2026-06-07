from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PortfolioOptimizationResponse(BaseModel):
    id: int
    user_id: int
    portfolio_name: str
    market_state: str
    strategy_type: str
    risk_level: str
    total_capital: float
    expected_return: float
    expected_risk: float
    expected_sharpe: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PortfolioOptimizationAssetResponse(BaseModel):
    id: int
    optimization_id: int
    asset_id: int
    allocation_percent: float
    allocation_amount: float
    asset_score: float
    recommendation_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
