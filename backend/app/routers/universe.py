from datetime import date

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.universe import (
    AssetCreate,
    AssetResponse,
    RecommendedAssetCreate,
    RecommendedAssetResponse,
    WatchlistCreate,
    WatchlistResponse,
)
from app.services.universe_service import (
    add_to_watchlist,
    create_asset,
    create_or_update_recommended_asset,
    get_asset_or_404,
    list_assets,
    list_recommended_assets,
    list_user_watchlist,
    remove_from_watchlist,
)


router = APIRouter()


@router.post("/assets", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def post_asset(asset_create: AssetCreate, db: Session = Depends(get_db)):
    return create_asset(db, asset_create)


@router.get("/assets", response_model=list[AssetResponse])
def get_assets(
    market: str | None = None,
    asset_type: str | None = None,
    industry_id: int | None = None,
    is_penny_stock: bool | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
):
    return list_assets(
        db,
        market=market,
        asset_type=asset_type,
        industry_id=industry_id,
        is_penny_stock=is_penny_stock,
        is_active=is_active,
    )


@router.get("/assets/{asset_id}", response_model=AssetResponse)
def get_asset(asset_id: int, db: Session = Depends(get_db)):
    return get_asset_or_404(db, asset_id)


@router.post(
    "/watchlist",
    response_model=WatchlistResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_watchlist(
    watchlist_create: WatchlistCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return add_to_watchlist(db, current_user.id, watchlist_create)


@router.get("/watchlist", response_model=list[WatchlistResponse])
def get_watchlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_user_watchlist(db, current_user.id)


@router.delete("/watchlist/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_watchlist(
    asset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    remove_from_watchlist(db, current_user.id, asset_id)


@router.post(
    "/recommended-assets",
    response_model=RecommendedAssetResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_recommended_asset(
    recommended_create: RecommendedAssetCreate,
    db: Session = Depends(get_db),
):
    return create_or_update_recommended_asset(db, recommended_create)


@router.get("/recommended-assets", response_model=list[RecommendedAssetResponse])
def get_recommended_assets(
    recommendation_date: date | None = None,
    db: Session = Depends(get_db),
):
    return list_recommended_assets(db, recommendation_date)
