"""
市場分析 API
Admin-protected endpoints for MarketScore calculation and score validation.
"""
from datetime import date as dt_date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routers.admin import _require_auth
from app.services import market_score_service as svc

router = APIRouter(prefix="/market-analysis", tags=["market-analysis"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class IndicatorValueIn(BaseModel):
    field_key: str
    display_name: str
    score: float            # 0-100 normalized
    raw_value: float | None = None
    notes: str | None = None


class SaveIndicatorValuesRequest(BaseModel):
    record_date: dt_date
    values: list[IndicatorValueIn]


class CalculateRequest(BaseModel):
    record_date: dt_date
    save_snapshot: bool = True


class UpdateReturnRequest(BaseModel):
    future_return_5d: float | None = None
    future_return_10d: float | None = None
    future_return_20d: float | None = None


# ── Indicator values ─────────────────────────────────────────────────────────

@router.get("/{market_code}/indicator-values")
def get_indicator_values(
    market_code: str,
    record_date: dt_date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    rows = svc.get_indicator_values(db, market_code.upper(), record_date)
    return [
        {
            "id": r.id,
            "record_date": str(r.record_date),
            "market_code": r.market_code,
            "field_key": r.field_key,
            "display_name": r.display_name,
            "score": r.score,
            "raw_value": r.raw_value,
            "notes": r.notes,
        }
        for r in rows
    ]


@router.post("/{market_code}/indicator-values")
def save_indicator_values(
    market_code: str,
    body: SaveIndicatorValuesRequest,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    rows = svc.upsert_indicator_values(
        db,
        market_code.upper(),
        body.record_date,
        [e.model_dump() for e in body.values],
    )
    return [
        {
            "id": r.id, "record_date": str(r.record_date), "market_code": r.market_code,
            "field_key": r.field_key, "display_name": r.display_name,
            "score": r.score, "raw_value": r.raw_value,
        }
        for r in rows
    ]


# ── Calculate score ──────────────────────────────────────────────────────────

@router.post("/{market_code}/calculate")
def calculate_score(
    market_code: str,
    body: CalculateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    mc = market_code.upper()
    # Build indicator_values from today's stored values
    daily_vals = svc.get_indicator_values(db, mc, body.record_date)
    indicator_values = {v.field_key: v.score for v in daily_vals}

    if not indicator_values:
        raise HTTPException(400, "尚未輸入今日指標分數，請先儲存指標數值")

    result = svc.calculate_market_score(db, mc, indicator_values)

    if body.save_snapshot:
        svc.save_snapshot(
            db, mc, body.record_date,
            result["score"], result["status"], result["breakdown"],
        )

    return result


# ── Snapshots ────────────────────────────────────────────────────────────────

@router.get("/{market_code}/snapshots")
def get_snapshots(
    market_code: str,
    limit: int = 90,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    rows = svc.list_snapshots(db, market_code.upper(), limit)
    return [
        {
            "id": r.id,
            "record_date": str(r.record_date),
            "market_code": r.market_code,
            "score": r.score,
            "status": r.status,
            "breakdown": r.breakdown,
            "formula_version": r.formula_version,
            "future_return_5d": r.future_return_5d,
            "future_return_10d": r.future_return_10d,
            "future_return_20d": r.future_return_20d,
            "is_hit": r.is_hit,
        }
        for r in rows
    ]


@router.put("/snapshots/{snapshot_id}/returns")
def update_snapshot_returns(
    snapshot_id: int,
    body: UpdateReturnRequest,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    try:
        row = svc.update_snapshot_returns(
            db, snapshot_id,
            body.future_return_5d, body.future_return_10d, body.future_return_20d,
        )
    except ValueError as e:
        raise HTTPException(404, str(e))
    return {
        "id": row.id, "record_date": str(row.record_date), "score": row.score,
        "future_return_5d": row.future_return_5d, "future_return_10d": row.future_return_10d,
        "future_return_20d": row.future_return_20d, "is_hit": row.is_hit,
    }


@router.get("/{market_code}/validation")
def get_validation(
    market_code: str,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return svc.get_validation_stats(db, market_code.upper())
