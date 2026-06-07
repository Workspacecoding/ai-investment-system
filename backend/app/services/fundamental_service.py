from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.fundamental import FundamentalReport, FundamentalScore
from app.schemas.fundamentals import FundamentalReportCreate
from app.services.universe_service import get_asset_or_404


def to_decimal(value: float | int | Decimal) -> Decimal:
    return Decimal(str(round(float(value), 4))).quantize(Decimal("0.0001"))


def create_or_update_fundamental_report(
    db: Session,
    asset_id: int,
    report_create: FundamentalReportCreate,
) -> FundamentalReport:
    get_asset_or_404(db, asset_id)
    report = (
        db.query(FundamentalReport)
        .filter(
            FundamentalReport.asset_id == asset_id,
            FundamentalReport.report_year == report_create.report_year,
            FundamentalReport.report_quarter == report_create.report_quarter,
        )
        .first()
    )
    data = report_create.model_dump()
    if report:
        for field, value in data.items():
            setattr(report, field, value)
    else:
        report = FundamentalReport(asset_id=asset_id, **data)
        db.add(report)

    db.commit()
    db.refresh(report)
    return report


def list_fundamental_reports(db: Session, asset_id: int) -> list[FundamentalReport]:
    get_asset_or_404(db, asset_id)
    return (
        db.query(FundamentalReport)
        .filter(FundamentalReport.asset_id == asset_id)
        .order_by(
            FundamentalReport.report_year.desc(),
            FundamentalReport.report_quarter.desc(),
        )
        .all()
    )


def get_latest_fundamental_report(db: Session, asset_id: int) -> FundamentalReport:
    get_asset_or_404(db, asset_id)
    report = (
        db.query(FundamentalReport)
        .filter(FundamentalReport.asset_id == asset_id)
        .order_by(
            FundamentalReport.report_year.desc(),
            FundamentalReport.report_quarter.desc(),
            FundamentalReport.id.desc(),
        )
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fundamental report not found",
        )
    return report


def get_fundamental_report_or_404(
    db: Session,
    asset_id: int,
    report_year: int,
    report_quarter: int,
) -> FundamentalReport:
    report = (
        db.query(FundamentalReport)
        .filter(
            FundamentalReport.asset_id == asset_id,
            FundamentalReport.report_year == report_year,
            FundamentalReport.report_quarter == report_quarter,
        )
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fundamental report not found",
        )
    return report


def calculate_growth_score(revenue_yoy_percent) -> Decimal:
    value = float(revenue_yoy_percent)
    if value >= 20:
        return Decimal("90")
    if value >= 10:
        return Decimal("75")
    if value >= 0:
        return Decimal("60")
    return Decimal("35")


def calculate_profitability_score(report: FundamentalReport) -> Decimal:
    roe = float(report.roe)
    net_margin = float(report.net_margin)
    if roe >= 20 and net_margin >= 15:
        return Decimal("90")
    if roe >= 10 and net_margin >= 8:
        return Decimal("75")
    if roe >= 5:
        return Decimal("60")
    return Decimal("40")


def calculate_financial_health_score(report: FundamentalReport) -> Decimal:
    debt_ratio = float(report.debt_ratio)
    current_ratio = float(report.current_ratio)
    if debt_ratio <= 40 and current_ratio >= 1.5:
        return Decimal("85")
    if debt_ratio <= 60 and current_ratio >= 1:
        return Decimal("65")
    return Decimal("40")


def calculate_cashflow_score(report: FundamentalReport) -> Decimal:
    operating_cash_flow = float(report.operating_cash_flow)
    free_cash_flow = float(report.free_cash_flow)
    if free_cash_flow > 0 and operating_cash_flow > 0:
        return Decimal("80")
    if operating_cash_flow > 0:
        return Decimal("60")
    return Decimal("35")


def get_fundamental_rating(fundamental_score: Decimal) -> str:
    if fundamental_score >= 85:
        return "excellent"
    if fundamental_score >= 70:
        return "good"
    if fundamental_score >= 55:
        return "normal"
    if fundamental_score >= 40:
        return "weak"
    return "poor"


def calculate_fundamental_score(
    db: Session,
    asset_id: int,
    report_year: int,
    report_quarter: int,
) -> FundamentalScore:
    get_asset_or_404(db, asset_id)
    report = get_fundamental_report_or_404(db, asset_id, report_year, report_quarter)
    growth_score = calculate_growth_score(report.revenue_yoy_percent)
    profitability_score = calculate_profitability_score(report)
    financial_health_score = calculate_financial_health_score(report)
    cashflow_score = calculate_cashflow_score(report)
    fundamental_score_value = (
        growth_score * Decimal("0.3")
        + profitability_score * Decimal("0.3")
        + financial_health_score * Decimal("0.2")
        + cashflow_score * Decimal("0.2")
    )
    score = (
        db.query(FundamentalScore)
        .filter(
            FundamentalScore.asset_id == asset_id,
            FundamentalScore.report_year == report_year,
            FundamentalScore.report_quarter == report_quarter,
        )
        .first()
    )
    data = {
        "growth_score": to_decimal(growth_score),
        "profitability_score": to_decimal(profitability_score),
        "financial_health_score": to_decimal(financial_health_score),
        "cashflow_score": to_decimal(cashflow_score),
        "fundamental_score": to_decimal(fundamental_score_value),
        "fundamental_rating": get_fundamental_rating(fundamental_score_value),
    }
    if score:
        for field, value in data.items():
            setattr(score, field, value)
    else:
        score = FundamentalScore(
            asset_id=asset_id,
            report_year=report_year,
            report_quarter=report_quarter,
            **data,
        )
        db.add(score)

    db.commit()
    db.refresh(score)
    return score


def list_fundamental_scores(db: Session, asset_id: int) -> list[FundamentalScore]:
    get_asset_or_404(db, asset_id)
    return (
        db.query(FundamentalScore)
        .filter(FundamentalScore.asset_id == asset_id)
        .order_by(
            FundamentalScore.report_year.desc(),
            FundamentalScore.report_quarter.desc(),
        )
        .all()
    )


def get_latest_fundamental_score(db: Session, asset_id: int) -> FundamentalScore:
    get_asset_or_404(db, asset_id)
    score = (
        db.query(FundamentalScore)
        .filter(FundamentalScore.asset_id == asset_id)
        .order_by(
            FundamentalScore.report_year.desc(),
            FundamentalScore.report_quarter.desc(),
            FundamentalScore.id.desc(),
        )
        .first()
    )
    if not score:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fundamental score not found",
        )
    return score
