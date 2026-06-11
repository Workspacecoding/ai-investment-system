from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class DailyReportItemResponse(BaseModel):
    id: int
    daily_report_id: int
    asset_id: int
    action: str | None = None
    score: Decimal | None = None
    swing_score: Decimal | None = None
    confidence: str | None = None
    reason: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DailyReportResponse(BaseModel):
    id: int
    user_id: int
    report_date: date
    market_state: str | None = None
    market_score: Decimal | None = None
    top_industry: str | None = None
    summary: str | None = None
    created_at: datetime
    items: list[DailyReportItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class MarketSummary(BaseModel):
    snapshot_date: date | None = None
    market_regime: str | None = None
    market_score: Decimal | None = None
    nasdaq_change_percent: Decimal | None = None
    sp500_change_percent: Decimal | None = None

    model_config = ConfigDict(from_attributes=True)


class OpportunityItem(BaseModel):
    asset_id: int
    symbol: str
    swing_score: Decimal
    confidence: str
    reason: str | None = None

    model_config = ConfigDict(from_attributes=True)


class WatchlistSummaryItem(BaseModel):
    asset_id: int
    symbol: str
    final_score: Decimal | None = None
    swing_score: Decimal | None = None
    action: str | None = None

    model_config = ConfigDict(from_attributes=True)


class PortfolioSummary(BaseModel):
    id: int | None = None
    name: str | None = None
    total_equity: Decimal | None = None
    unrealized_pnl: Decimal | None = None
    cash_balance: Decimal | None = None

    model_config = ConfigDict(from_attributes=True)


class GoalSummary(BaseModel):
    id: int | None = None
    current_capital: Decimal | None = None
    target_capital: Decimal | None = None
    required_annual_return: Decimal | None = None
    progress_percent: float | None = None

    model_config = ConfigDict(from_attributes=True)


class DashboardResponse(BaseModel):
    market: MarketSummary
    daily_report: DailyReportResponse | None = None
    opportunities: list[OpportunityItem]
    watchlist: list[WatchlistSummaryItem]
    portfolio: PortfolioSummary
    goal: GoalSummary
