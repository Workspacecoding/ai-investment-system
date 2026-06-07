from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.fundamentals import (
    FundamentalReportCreate,
    FundamentalReportResponse,
    FundamentalScoreResponse,
)
from app.services.fundamental_service import (
    calculate_fundamental_score,
    create_or_update_fundamental_report,
    get_latest_fundamental_report,
    get_latest_fundamental_score,
    list_fundamental_reports,
    list_fundamental_scores,
)


router = APIRouter(prefix="/assets/{asset_id}/fundamentals")


@router.post("", response_model=FundamentalReportResponse)
def post_fundamental_report(
    asset_id: int,
    report_create: FundamentalReportCreate,
    db: Session = Depends(get_db),
):
    return create_or_update_fundamental_report(db, asset_id, report_create)


@router.get("", response_model=list[FundamentalReportResponse])
def get_fundamental_reports(asset_id: int, db: Session = Depends(get_db)):
    return list_fundamental_reports(db, asset_id)


@router.get("/latest", response_model=FundamentalReportResponse)
def get_fundamental_report_latest(asset_id: int, db: Session = Depends(get_db)):
    return get_latest_fundamental_report(db, asset_id)


@router.get("/scores", response_model=list[FundamentalScoreResponse])
def get_fundamental_scores(asset_id: int, db: Session = Depends(get_db)):
    return list_fundamental_scores(db, asset_id)


@router.get("/scores/latest", response_model=FundamentalScoreResponse)
def get_fundamental_score_latest(asset_id: int, db: Session = Depends(get_db)):
    return get_latest_fundamental_score(db, asset_id)


@router.post("/{year}/{quarter}/score", response_model=FundamentalScoreResponse)
def post_fundamental_score(
    asset_id: int,
    year: int,
    quarter: int,
    db: Session = Depends(get_db),
):
    return calculate_fundamental_score(db, asset_id, year, quarter)
