from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FundamentalReportCreate(BaseModel):
    report_year: int
    report_quarter: int = Field(ge=1, le=4)
    revenue: float
    revenue_yoy_percent: float
    revenue_qoq_percent: float
    gross_profit: float
    operating_income: float
    net_income: float
    eps: float
    gross_margin: float
    operating_margin: float
    net_margin: float
    roe: float
    roa: float
    debt_ratio: float
    current_ratio: float
    operating_cash_flow: float
    free_cash_flow: float


class FundamentalReportResponse(FundamentalReportCreate):
    id: int
    asset_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FundamentalScoreResponse(BaseModel):
    id: int
    asset_id: int
    report_year: int
    report_quarter: int
    growth_score: float
    profitability_score: float
    financial_health_score: float
    cashflow_score: float
    fundamental_score: float
    fundamental_rating: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
