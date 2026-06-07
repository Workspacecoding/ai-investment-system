from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.universe import AssetResponse
from app.schemas.industry import (
    IndustryCreate,
    IndustryMomentumCreate,
    IndustryMomentumResponse,
    IndustryResponse,
)
from app.services.watchlist_sync_service import set_industry_sync
from app.services.industry_service import (
    create_industry,
    get_latest_momentum,
    get_momentum_ranking,
    list_industries,
    recalculate_ranking,
    upsert_industry_momentum,
)


router = APIRouter(prefix="/industries")


@router.post("", response_model=IndustryResponse, status_code=status.HTTP_201_CREATED)
def post_industry(industry_create: IndustryCreate, db: Session = Depends(get_db)):
    return create_industry(db, industry_create)


@router.get("", response_model=list[IndustryResponse])
def get_industries(db: Session = Depends(get_db)):
    return list_industries(db)


@router.post(
    "/{industry_id}/momentum",
    response_model=IndustryMomentumResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_industry_momentum(
    industry_id: int,
    momentum_create: IndustryMomentumCreate,
    db: Session = Depends(get_db),
):
    return upsert_industry_momentum(db, industry_id, momentum_create)


@router.get("/momentum/latest", response_model=list[IndustryMomentumResponse])
def get_industries_latest_momentum(db: Session = Depends(get_db)):
    return get_latest_momentum(db)


@router.get("/momentum/ranking", response_model=list[IndustryMomentumResponse])
def get_industries_momentum_ranking(db: Session = Depends(get_db)):
    return get_momentum_ranking(db)


@router.post("/momentum/recalculate", response_model=list[IndustryMomentumResponse])
def post_industries_momentum_recalculate(db: Session = Depends(get_db)):
    return recalculate_ranking(db)


@router.post("/{industry_id}/sync/start", response_model=list[AssetResponse])
def post_industry_sync_start(industry_id: int, db: Session = Depends(get_db)):
    return set_industry_sync(db, industry_id, True)


@router.post("/{industry_id}/sync/stop", response_model=list[AssetResponse])
def post_industry_sync_stop(industry_id: int, db: Session = Depends(get_db)):
    return set_industry_sync(db, industry_id, False)
