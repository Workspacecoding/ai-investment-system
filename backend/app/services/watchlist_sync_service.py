import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.asset import Asset, UserWatchlist
from app.models.price import AssetPrice
from app.services.crawler_service import fetch_daily_prices

logger = logging.getLogger(__name__)


@dataclass
class SyncResult:
    inserted_count: int
    skipped_duplicate_count: int
    warning_count: int
    start_date: date
    end_date: date


def ten_year_window() -> tuple[date, date]:
    end_date = date.today()
    start_date = end_date - timedelta(days=365 * 10)
    return start_date, end_date


def get_watchlist_or_404(db: Session, user_id: int, asset_id: int) -> UserWatchlist:
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
    return watchlist


def get_asset_or_404(db: Session, asset_id: int) -> Asset:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return asset


def cleanup_old_price_data(db: Session, asset_id: int) -> int:
    cutoff_date = date.today() - timedelta(days=365 * 10)
    deleted_count = (
        db.query(AssetPrice)
        .filter(AssetPrice.asset_id == asset_id, AssetPrice.trade_date < cutoff_date)
        .delete(synchronize_session=False)
    )
    db.commit()
    return deleted_count


def _decimal_equal(existing_value, incoming_value) -> bool:
    return Decimal(str(existing_value)) == Decimal(str(incoming_value))


def _price_data_matches(existing_price: AssetPrice, price_data: dict) -> bool:
    numeric_fields = (
        "open_price",
        "high_price",
        "low_price",
        "close_price",
    )
    for field in numeric_fields:
        if not _decimal_equal(getattr(existing_price, field), price_data[field]):
            return False

    return int(existing_price.volume) == int(price_data["volume"])


def sync_asset_history(
    db: Session,
    asset_id: int,
    start_date: date,
    end_date: date,
) -> SyncResult:
    asset = get_asset_or_404(db, asset_id)
    price_rows = fetch_daily_prices(asset.symbol, asset.market, start_date, end_date)
    existing_prices = {
        price.trade_date: price
        for price in db.query(AssetPrice)
        .filter(
            AssetPrice.asset_id == asset_id,
            AssetPrice.trade_date >= start_date,
            AssetPrice.trade_date <= end_date,
        )
        .all()
    }

    inserted_count = 0
    skipped_duplicate_count = 0
    warning_count = 0

    for price_data in price_rows:
        existing_price = existing_prices.get(price_data["trade_date"])
        if existing_price:
            if _price_data_matches(existing_price, price_data):
                skipped_duplicate_count += 1
                continue

            warning_count += 1
            logger.warning(
                "Price data conflict skipped for asset_id=%s trade_date=%s",
                asset_id,
                price_data["trade_date"],
            )
        else:
            db.add(AssetPrice(asset_id=asset_id, **price_data))
            inserted_count += 1

    now = datetime.utcnow()
    asset.data_sync_enabled = True
    asset.last_price_synced_at = now
    db.commit()
    cleanup_old_price_data(db, asset_id)
    return SyncResult(
        inserted_count=inserted_count,
        skipped_duplicate_count=skipped_duplicate_count,
        warning_count=warning_count,
        start_date=start_date,
        end_date=end_date,
    )


def enable_watchlist_sync(db: Session, user_id: int, asset_id: int) -> dict:
    watchlist = get_watchlist_or_404(db, user_id, asset_id)
    asset = get_asset_or_404(db, asset_id)
    start_date, end_date = ten_year_window()
    sync_result = sync_asset_history(db, asset_id, start_date, end_date)
    now = datetime.utcnow()
    watchlist.is_sync_enabled = True
    watchlist.sync_start_date = start_date
    watchlist.sync_end_date = end_date
    watchlist.last_synced_at = now
    asset.data_sync_enabled = True
    asset.last_price_synced_at = now
    db.commit()
    db.refresh(watchlist)
    return {
        "id": watchlist.id,
        "user_id": watchlist.user_id,
        "asset_id": watchlist.asset_id,
        "note": watchlist.note,
        "is_sync_enabled": watchlist.is_sync_enabled,
        "sync_start_date": watchlist.sync_start_date,
        "sync_end_date": watchlist.sync_end_date,
        "last_synced_at": watchlist.last_synced_at,
        "created_at": watchlist.created_at,
        "inserted_count": sync_result.inserted_count,
        "skipped_duplicate_count": sync_result.skipped_duplicate_count,
        "warning_count": sync_result.warning_count,
        "start_date": sync_result.start_date,
        "end_date": sync_result.end_date,
    }


def disable_watchlist_sync(db: Session, user_id: int, asset_id: int) -> UserWatchlist:
    watchlist = get_watchlist_or_404(db, user_id, asset_id)
    watchlist.is_sync_enabled = False
    db.flush()
    enabled_count = (
        db.query(UserWatchlist)
        .filter(UserWatchlist.asset_id == asset_id, UserWatchlist.is_sync_enabled.is_(True))
        .count()
    )
    asset = get_asset_or_404(db, asset_id)
    if enabled_count == 0:
        asset.data_sync_enabled = False
    db.commit()
    db.refresh(watchlist)
    return watchlist


def set_industry_sync(db: Session, industry_id: int, enabled: bool) -> list[Asset]:
    assets = db.query(Asset).filter(Asset.industry_id == industry_id).all()
    if not assets:
        return []

    start_date, end_date = ten_year_window()
    now = datetime.utcnow()
    for asset in assets:
        asset.data_sync_enabled = enabled
        if not enabled:
            db.query(UserWatchlist).filter(UserWatchlist.asset_id == asset.id).update(
                {"is_sync_enabled": False},
                synchronize_session=False,
            )
        if enabled:
            sync_asset_history(db, asset.id, start_date, end_date)
            asset.last_price_synced_at = now

    db.commit()
    return assets
