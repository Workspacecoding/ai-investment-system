from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.market import MarketSnapshotCreate, MarketSnapshotResponse
from app.services.market_service import (
    get_latest_market_snapshot,
    list_market_snapshots,
    upsert_market_snapshot,
)


router = APIRouter(prefix="/market")


@router.post("/snapshots", response_model=MarketSnapshotResponse)
def post_market_snapshot(
    snapshot_create: MarketSnapshotCreate,
    db: Session = Depends(get_db),
):
    return upsert_market_snapshot(db, snapshot_create)


@router.get("/snapshots/latest", response_model=MarketSnapshotResponse)
def get_latest_snapshot(db: Session = Depends(get_db)):
    snapshot = get_latest_market_snapshot(db)
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Market snapshot not found",
        )
    return snapshot


@router.get("/snapshots", response_model=list[MarketSnapshotResponse])
def get_market_snapshots(db: Session = Depends(get_db)):
    return list_market_snapshots(db)
