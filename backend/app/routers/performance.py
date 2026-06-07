from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.performance import PerformanceReportResponse, StrategyPerformanceResponse
from app.services.performance_service import (
    generate_monthly_report,
    get_latest_report,
    list_reports,
    list_strategy_performance,
)


router = APIRouter()


@router.post(
    "/paper-portfolios/{portfolio_id}/reports/generate",
    response_model=PerformanceReportResponse,
)
def post_generate_report(
    portfolio_id: int,
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return generate_monthly_report(db, portfolio_id, current_user.id, year, month)


@router.get(
    "/paper-portfolios/{portfolio_id}/reports",
    response_model=list[PerformanceReportResponse],
)
def get_reports(
    portfolio_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_reports(db, portfolio_id, current_user.id)


@router.get(
    "/paper-portfolios/{portfolio_id}/reports/latest",
    response_model=PerformanceReportResponse,
)
def get_report_latest(
    portfolio_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_latest_report(db, portfolio_id, current_user.id)


@router.get(
    "/paper-portfolios/{portfolio_id}/strategy-performance",
    response_model=list[StrategyPerformanceResponse],
)
def get_strategy_performance(
    portfolio_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_strategy_performance(db, portfolio_id, current_user.id)
