from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.asset import Asset, RecommendedAsset, UserWatchlist
from app.schemas.universe import AssetCreate, RecommendedAssetCreate, WatchlistCreate


def create_asset(db: Session, asset_create: AssetCreate) -> Asset:
    existing_asset = (
        db.query(Asset)
        .filter(Asset.symbol == asset_create.symbol, Asset.market == asset_create.market)
        .first()
    )
    if existing_asset:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset already exists",
        )

    asset = Asset(**asset_create.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def list_assets(
    db: Session,
    market: str | None = None,
    asset_type: str | None = None,
    industry_id: int | None = None,
    is_penny_stock: bool | None = None,
    is_active: bool | None = None,
) -> list[Asset]:
    query = db.query(Asset)
    if market is not None:
        query = query.filter(Asset.market == market)
    if asset_type is not None:
        query = query.filter(Asset.asset_type == asset_type)
    if industry_id is not None:
        query = query.filter(Asset.industry_id == industry_id)
    if is_penny_stock is not None:
        query = query.filter(Asset.is_penny_stock == is_penny_stock)
    if is_active is not None:
        query = query.filter(Asset.is_active == is_active)
    return query.order_by(Asset.market.asc(), Asset.symbol.asc()).all()


def get_asset_or_404(db: Session, asset_id: int) -> Asset:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )
    return asset


def get_asset_by_symbol(db: Session, symbol: str, market: str) -> Asset | None:
    return db.query(Asset).filter(Asset.symbol == symbol, Asset.market == market).first()


def add_to_watchlist(
    db: Session,
    user_id: int,
    watchlist_create: WatchlistCreate,
) -> UserWatchlist:
    get_asset_or_404(db, watchlist_create.asset_id)
    existing_watchlist = (
        db.query(UserWatchlist)
        .filter(
            UserWatchlist.user_id == user_id,
            UserWatchlist.asset_id == watchlist_create.asset_id,
        )
        .first()
    )
    if existing_watchlist:
        existing_watchlist.note = watchlist_create.note
        db.commit()
        db.refresh(existing_watchlist)
        return existing_watchlist

    watchlist = UserWatchlist(user_id=user_id, **watchlist_create.model_dump())
    db.add(watchlist)
    db.commit()
    db.refresh(watchlist)
    return watchlist


def remove_from_watchlist(db: Session, user_id: int, asset_id: int) -> None:
    watchlist = (
        db.query(UserWatchlist)
        .filter(UserWatchlist.user_id == user_id, UserWatchlist.asset_id == asset_id)
        .first()
    )
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist asset not found",
        )
    db.delete(watchlist)
    db.commit()


def list_user_watchlist(db: Session, user_id: int) -> list[UserWatchlist]:
    return (
        db.query(UserWatchlist)
        .filter(UserWatchlist.user_id == user_id)
        .order_by(UserWatchlist.created_at.desc(), UserWatchlist.id.desc())
        .all()
    )


def create_or_update_recommended_asset(
    db: Session,
    recommended_create: RecommendedAssetCreate,
) -> RecommendedAsset:
    get_asset_or_404(db, recommended_create.asset_id)
    recommended = (
        db.query(RecommendedAsset)
        .filter(
            RecommendedAsset.asset_id == recommended_create.asset_id,
            RecommendedAsset.recommendation_date
            == recommended_create.recommendation_date,
            RecommendedAsset.source == recommended_create.source,
        )
        .first()
    )

    data = recommended_create.model_dump()
    if recommended:
        for field, value in data.items():
            setattr(recommended, field, value)
    else:
        recommended = RecommendedAsset(**data)
        db.add(recommended)

    db.commit()
    db.refresh(recommended)
    return recommended


def list_recommended_assets(
    db: Session,
    recommendation_date: date | None = None,
) -> list[RecommendedAsset]:
    query = db.query(RecommendedAsset)
    if recommendation_date is not None:
        query = query.filter(RecommendedAsset.recommendation_date == recommendation_date)
    return query.order_by(
        RecommendedAsset.recommendation_date.desc(),
        RecommendedAsset.score.desc(),
        RecommendedAsset.id.desc(),
    ).all()
