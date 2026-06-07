from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.indicators import (
    AssetPriceCreate,
    AssetPriceResponse,
    FactorScoreResponse,
    TechnicalIndicatorResponse,
)
from app.services.factor_service import generate_basic_factor_scores, list_factor_scores
from app.services.indicator_service import (
    calculate_indicators,
    create_or_update_price,
    list_indicators,
    list_prices,
)


router = APIRouter(prefix="/assets/{asset_id}")


@router.post("/prices", response_model=AssetPriceResponse)
def post_asset_price(
    asset_id: int,
    price_create: AssetPriceCreate,
    db: Session = Depends(get_db),
):
    return create_or_update_price(db, asset_id, price_create)


@router.get("/prices", response_model=list[AssetPriceResponse])
def get_asset_prices(
    asset_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
):
    return list_prices(db, asset_id, start_date=start_date, end_date=end_date)


@router.post("/indicators/calculate", response_model=list[TechnicalIndicatorResponse])
def post_calculate_indicators(asset_id: int, db: Session = Depends(get_db)):
    return calculate_indicators(db, asset_id)


@router.get("/indicators", response_model=list[TechnicalIndicatorResponse])
def get_asset_indicators(asset_id: int, db: Session = Depends(get_db)):
    return list_indicators(db, asset_id)


@router.post("/factors/generate", response_model=list[FactorScoreResponse])
def post_generate_factors(asset_id: int, db: Session = Depends(get_db)):
    return generate_basic_factor_scores(db, asset_id)


@router.get("/factors", response_model=list[FactorScoreResponse])
def get_asset_factors(
    asset_id: int,
    trade_date: date | None = None,
    db: Session = Depends(get_db),
):
    return list_factor_scores(db, asset_id, trade_date)
