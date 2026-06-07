from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PaperPortfolioCreate(BaseModel):
    name: str
    initial_cash: float = Field(gt=0)


class PaperPortfolioResponse(BaseModel):
    id: int
    user_id: int
    name: str
    initial_cash: float
    cash_balance: float
    total_market_value: float
    total_equity: float
    realized_pnl: float
    unrealized_pnl: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaperOrderCreate(BaseModel):
    asset_id: int
    quantity: float = Field(gt=0)
    price: float = Field(gt=0)
    order_type: str = "market"
    trade_plan_id: int | None = None


class PaperOrderResponse(BaseModel):
    id: int
    portfolio_id: int
    asset_id: int
    trade_plan_id: int | None = None
    side: str
    order_type: str
    price: float
    quantity: float
    amount: float
    status: str
    executed_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaperPositionResponse(BaseModel):
    id: int
    portfolio_id: int
    asset_id: int
    quantity: float
    avg_cost: float
    current_price: float
    market_value: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaperTradeLogResponse(BaseModel):
    id: int
    portfolio_id: int
    asset_id: int
    buy_order_id: int | None = None
    sell_order_id: int | None = None
    realized_pnl: float
    realized_pnl_percent: float
    holding_days: int
    strategy_type: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
