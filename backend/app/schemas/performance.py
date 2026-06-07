from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PerformanceReportResponse(BaseModel):
    id: int
    portfolio_id: int
    report_year: int
    report_month: int
    initial_equity: float
    ending_equity: float
    total_return_percent: float
    realized_pnl: float
    unrealized_pnl: float
    total_trades: int
    win_trades: int
    lose_trades: int
    win_rate: float
    max_drawdown: float
    best_asset_id: int | None = None
    worst_asset_id: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StrategyPerformanceResponse(BaseModel):
    id: int
    portfolio_id: int
    strategy_type: str
    total_trades: int
    win_rate: float
    avg_profit_percent: float
    avg_loss_percent: float
    net_return_percent: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
