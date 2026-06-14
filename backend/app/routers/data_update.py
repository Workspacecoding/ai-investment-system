import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.data_update_task import DataUpdateLog, DataUpdateTask
from app.models.user import User

router = APIRouter(prefix="/admin/data-update", tags=["data-update"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    name: Optional[str] = None
    indicator_ids: list[int] = []
    target_type: str = "all"          # single|multiple|industry|market|all
    target_ids: Optional[list] = None
    update_mode: str = "manual"       # manual|auto
    data_mode: str = "incremental"    # full|incremental|backfill
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    auto_frequency: Optional[str] = None
    cron_expr: Optional[str] = None
    skip_existing: bool = True
    overwrite: bool = False
    retry_on_fail: bool = True


class TaskResponse(BaseModel):
    id: int
    name: Optional[str]
    indicator_ids: list
    target_type: str
    target_ids: Optional[list]
    update_mode: str
    data_mode: str
    start_date: Optional[str]
    end_date: Optional[str]
    auto_frequency: Optional[str]
    cron_expr: Optional[str]
    skip_existing: bool
    overwrite: bool
    retry_on_fail: bool
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class ExecuteRequest(BaseModel):
    indicator_ids: list[int] = []
    target_type: str = "all"
    target_ids: Optional[list] = None
    update_mode: str = "manual"
    data_mode: str = "incremental"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    skip_existing: bool = True
    overwrite: bool = False
    retry_on_fail: bool = True
    task_id: Optional[int] = None


class LogResponse(BaseModel):
    id: int
    task_id: Optional[int]
    executed_at: str
    indicator_ids: Optional[list]
    target_count: int
    added_count: int
    updated_count: int
    failed_count: int
    status: str
    error_message: Optional[str]
    duration_seconds: Optional[float]
    completed_at: Optional[str]

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fmt(dt) -> Optional[str]:
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    return dt.isoformat()


def _task_resp(t: DataUpdateTask) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "indicator_ids": t.indicator_ids or [],
        "target_type": t.target_type,
        "target_ids": t.target_ids,
        "update_mode": t.update_mode,
        "data_mode": t.data_mode,
        "start_date": t.start_date,
        "end_date": t.end_date,
        "auto_frequency": t.auto_frequency,
        "cron_expr": t.cron_expr,
        "skip_existing": t.skip_existing,
        "overwrite": t.overwrite,
        "retry_on_fail": t.retry_on_fail,
        "is_active": t.is_active,
        "created_at": _fmt(t.created_at) or "",
    }


def _log_resp(lg: DataUpdateLog) -> dict:
    return {
        "id": lg.id,
        "task_id": lg.task_id,
        "executed_at": _fmt(lg.executed_at) or "",
        "indicator_ids": lg.indicator_ids,
        "target_count": lg.target_count,
        "added_count": lg.added_count,
        "updated_count": lg.updated_count,
        "failed_count": lg.failed_count,
        "status": lg.status,
        "error_message": lg.error_message,
        "duration_seconds": lg.duration_seconds,
        "completed_at": _fmt(lg.completed_at),
    }


def _resolve_target_count(db: Session, target_type: str, target_ids) -> int:
    """Estimate how many assets will be affected."""
    from app.models.asset import Asset
    try:
        if target_type == "all":
            return db.query(Asset).filter(Asset.is_active == True).count()
        if target_type in ("single", "multiple") and target_ids:
            return len(target_ids)
        if target_type == "market" and target_ids:
            return db.query(Asset).filter(Asset.market.in_(target_ids), Asset.is_active == True).count()
        if target_type == "industry" and target_ids:
            return db.query(Asset).filter(Asset.industry_id.in_(target_ids), Asset.is_active == True).count()
    except Exception:
        pass
    return 0


def _execute_update(db: Session, req: ExecuteRequest) -> DataUpdateLog:
    """Create a log, run the update, and return the completed log."""
    start_ts = time.time()
    target_count = _resolve_target_count(db, req.target_type, req.target_ids)

    lg = DataUpdateLog(
        task_id=req.task_id,
        indicator_ids=req.indicator_ids,
        target_count=target_count,
        status="running",
        executed_at=datetime.now(timezone.utc),
    )
    db.add(lg)
    db.commit()
    db.refresh(lg)

    added = updated = failed = 0
    error_msgs: list[str] = []

    try:
        from app.models.asset import Asset
        from app.models.asset_daily_data import AssetDailyData
        from app.services.crawler_service import fetch_daily_prices
        from datetime import date, timedelta

        # Resolve assets
        q = db.query(Asset).filter(Asset.is_active == True)
        if req.target_type in ("single", "multiple") and req.target_ids:
            q = q.filter(Asset.id.in_(req.target_ids))
        elif req.target_type == "market" and req.target_ids:
            q = q.filter(Asset.market.in_(req.target_ids))
        elif req.target_type == "industry" and req.target_ids:
            q = q.filter(Asset.industry_id.in_(req.target_ids))
        assets = q.limit(500).all()

        # Date range
        today = date.today()
        if req.data_mode == "backfill" and req.start_date:
            fetch_start = date.fromisoformat(req.start_date)
        elif req.data_mode == "full":
            fetch_start = today - timedelta(days=365 * 5)
        else:
            fetch_start = today - timedelta(days=7)

        fetch_end = date.fromisoformat(req.end_date) if req.end_date else today

        for asset in assets:
            try:
                prices = fetch_daily_prices(asset.symbol, asset.market, fetch_start, fetch_end)
                for p in prices:
                    existing = db.query(AssetDailyData).filter(
                        AssetDailyData.asset_id == asset.id,
                        AssetDailyData.trade_date == p["trade_date"],
                    ).first()
                    if existing:
                        if req.skip_existing and not req.overwrite:
                            continue
                        existing.open_price = p["open_price"]
                        existing.high_price = p["high_price"]
                        existing.low_price = p["low_price"]
                        existing.close_price = p["close_price"]
                        existing.volume = p["volume"]
                        updated += 1
                    else:
                        db.add(AssetDailyData(
                            asset_id=asset.id,
                            trade_date=p["trade_date"],
                            open_price=p["open_price"],
                            high_price=p["high_price"],
                            low_price=p["low_price"],
                            close_price=p["close_price"],
                            volume=p["volume"],
                        ))
                        added += 1
                db.commit()
            except Exception as e:
                failed += 1
                if req.retry_on_fail:
                    try:
                        prices = fetch_daily_prices(asset.symbol, asset.market, fetch_start, fetch_end)
                    except Exception:
                        pass
                error_msgs.append(f"{asset.symbol}: {str(e)[:100]}")

    except Exception as e:
        failed = max(failed, 1)
        error_msgs.append(str(e)[:200])

    duration = round(time.time() - start_ts, 2)
    lg.added_count = added
    lg.updated_count = updated
    lg.failed_count = failed
    lg.target_count = target_count or (added + updated + failed)
    lg.status = "failed" if (failed > 0 and added == 0 and updated == 0) else "success"
    lg.error_message = "\n".join(error_msgs)[:1000] if error_msgs else None
    lg.duration_seconds = duration
    lg.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(lg)
    return lg


# ── Task CRUD ─────────────────────────────────────────────────────────────────

@router.get("/tasks")
def list_tasks(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    tasks = db.query(DataUpdateTask).order_by(DataUpdateTask.created_at.desc()).all()
    return [_task_resp(t) for t in tasks]


@router.post("/tasks", status_code=status.HTTP_201_CREATED)
def create_task(body: TaskCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    t = DataUpdateTask(**body.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return _task_resp(t)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    t = db.query(DataUpdateTask).filter(DataUpdateTask.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(t)
    db.commit()


# ── Execute ───────────────────────────────────────────────────────────────────

@router.post("/execute", status_code=status.HTTP_201_CREATED)
def execute_update(body: ExecuteRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    lg = _execute_update(db, body)
    return _log_resp(lg)


@router.post("/tasks/{task_id}/execute", status_code=status.HTTP_201_CREATED)
def execute_task(task_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    t = db.query(DataUpdateTask).filter(DataUpdateTask.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    req = ExecuteRequest(
        task_id=task_id,
        indicator_ids=t.indicator_ids or [],
        target_type=t.target_type,
        target_ids=t.target_ids,
        update_mode=t.update_mode,
        data_mode=t.data_mode,
        start_date=t.start_date,
        end_date=t.end_date,
        skip_existing=t.skip_existing,
        overwrite=t.overwrite,
        retry_on_fail=t.retry_on_fail,
    )
    lg = _execute_update(db, req)
    return _log_resp(lg)


# ── Logs ──────────────────────────────────────────────────────────────────────

@router.get("/logs")
def list_logs(task_id: Optional[int] = None, limit: int = 100, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(DataUpdateLog).order_by(DataUpdateLog.executed_at.desc())
    if task_id is not None:
        q = q.filter(DataUpdateLog.task_id == task_id)
    return [_log_resp(lg) for lg in q.limit(limit).all()]


@router.delete("/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_log(log_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    lg = db.query(DataUpdateLog).filter(DataUpdateLog.id == log_id).first()
    if not lg:
        raise HTTPException(status_code=404, detail="Log not found")
    db.delete(lg)
    db.commit()
