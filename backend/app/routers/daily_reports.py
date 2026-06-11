from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.daily_reports import DailyReportResponse, DashboardResponse
from app.services.daily_report_service import (
    generate_daily_report,
    get_daily_report,
    get_dashboard_data,
    get_latest_daily_report,
    list_daily_reports,
)

router = APIRouter()


@router.post("/daily-reports/generate", response_model=DailyReportResponse, status_code=201)
def post_generate_daily_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return generate_daily_report(db, current_user.id)


@router.get("/daily-reports/latest", response_model=DailyReportResponse)
def get_latest_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = get_latest_daily_report(db, current_user.id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No daily report found",
        )
    return report


@router.get("/daily-reports", response_model=list[DailyReportResponse])
def get_daily_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_daily_reports(db, current_user.id)


@router.get("/daily-reports/{report_id}", response_model=DailyReportResponse)
def get_daily_report_by_id(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_daily_report(db, report_id, current_user.id)


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = get_dashboard_data(db, current_user.id)
    return DashboardResponse(
        market=data["market"] if data["market"] else {},
        daily_report=data["daily_report"],
        opportunities=data["opportunities"],
        watchlist=data["watchlist"],
        portfolio=data["portfolio"] if data["portfolio"] else {},
        goal=data["goal"] if data["goal"] else {},
    )
