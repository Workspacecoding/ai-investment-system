from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.price_levels import PriceLevelResponse
from app.services.price_level_service import (
    calculate_price_level,
    get_latest_price_level,
    list_price_levels,
)


router = APIRouter(prefix="/assets/{asset_id}/price-levels")


@router.post("/calculate", response_model=list[PriceLevelResponse])
def post_calculate_price_levels(asset_id: int, db: Session = Depends(get_db)):
    return calculate_price_level(db, asset_id)


@router.get("", response_model=list[PriceLevelResponse])
def get_price_levels(asset_id: int, db: Session = Depends(get_db)):
    return list_price_levels(db, asset_id)


@router.get("/latest", response_model=PriceLevelResponse)
def get_latest_asset_price_level(asset_id: int, db: Session = Depends(get_db)):
    return get_latest_price_level(db, asset_id)
