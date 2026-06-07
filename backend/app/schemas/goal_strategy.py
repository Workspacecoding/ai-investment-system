from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class GoalStrategyResponse(BaseModel):
    id: int
    user_id: int
    goal_id: int
    current_capital: float
    target_capital: float
    target_date: date
    required_annual_return: float
    required_monthly_return: float
    strategy_type: str
    risk_level: str
    etf_ratio: float
    stock_ratio: float
    crypto_ratio: float
    cash_ratio: float
    probability_score: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GoalStrategyRecommendationResponse(BaseModel):
    id: int
    goal_strategy_id: int
    asset_id: int
    recommendation_type: str
    allocation_percent: float
    reason: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
