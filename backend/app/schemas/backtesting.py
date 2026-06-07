from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class BacktestRunCreate(BaseModel):
    name: str = "Strategy Backtest"
    start_date: date
    end_date: date
    market: str | None = None
    strategy_type: str
    initial_capital: float = Field(gt=0)


class BacktestRunResponse(BaseModel):
    id: int
    name: str
    start_date: date
    end_date: date
    market: str | None = None
    strategy_type: str
    initial_capital: float
    final_capital: float
    total_return_percent: float
    max_drawdown: float
    win_rate: float
    total_trades: int
    profit_factor: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BacktestTradeResponse(BaseModel):
    id: int
    backtest_run_id: int
    asset_id: int
    strategy_type: str
    entry_date: date
    exit_date: date
    entry_price: float
    exit_price: float
    quantity: float
    pnl: float
    pnl_percent: float
    holding_days: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FactorBacktestCreate(BaseModel):
    factor_name: str
    start_date: date
    end_date: date
    industry_id: int | None = None
    market: str | None = None


class FactorRankCreate(BaseModel):
    start_date: date
    end_date: date
    industry_id: int | None = None
    market: str | None = None


class FactorBacktestResultResponse(BaseModel):
    id: int
    factor_name: str
    factor_type: str
    industry_id: int | None = None
    market: str | None = None
    start_date: date
    end_date: date
    total_signals: int
    win_rate: float
    avg_return_percent: float
    max_drawdown: float
    profit_factor: float
    factor_rank: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
