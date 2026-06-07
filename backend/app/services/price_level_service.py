from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.price import AssetPrice
from app.models.price_level import PriceLevel
from app.services.indicator_service import get_asset_or_404


def to_decimal(value: float | int) -> Decimal:
    return Decimal(str(round(float(value), 4)))


def get_level(percentile: float) -> str:
    if percentile < 0.2:
        return "very_low"
    if percentile < 0.4:
        return "low"
    if percentile < 0.6:
        return "normal"
    if percentile < 0.8:
        return "high"
    return "very_high"


def calculate_percentile(current_price: float, low_price: float, high_price: float) -> float:
    if high_price == low_price:
        return 0.0
    return (current_price - low_price) / (high_price - low_price)


def upsert_price_level(
    db: Session,
    asset_id: int,
    trade_date,
    level_data: dict,
) -> PriceLevel:
    price_level = (
        db.query(PriceLevel)
        .filter(PriceLevel.asset_id == asset_id, PriceLevel.trade_date == trade_date)
        .first()
    )
    if price_level:
        for field, value in level_data.items():
            setattr(price_level, field, value)
    else:
        price_level = PriceLevel(asset_id=asset_id, trade_date=trade_date, **level_data)
        db.add(price_level)
    return price_level


def calculate_price_level(db: Session, asset_id: int) -> list[PriceLevel]:
    get_asset_or_404(db, asset_id)
    prices = (
        db.query(AssetPrice)
        .filter(AssetPrice.asset_id == asset_id)
        .order_by(AssetPrice.trade_date.asc())
        .all()
    )
    if not prices:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset prices not found",
        )

    levels: list[PriceLevel] = []
    for index, price in enumerate(prices):
        history = prices[: index + 1]
        history_52w = history[-252:]
        current_price = float(price.close_price)
        high_52w = max(float(item.close_price) for item in history_52w)
        low_52w = min(float(item.close_price) for item in history_52w)
        high_all_time = max(float(item.close_price) for item in history)
        low_all_time = min(float(item.close_price) for item in history)
        percentile_52w = calculate_percentile(current_price, low_52w, high_52w)
        percentile_all_time = calculate_percentile(
            current_price,
            low_all_time,
            high_all_time,
        )

        levels.append(
            upsert_price_level(
                db,
                asset_id,
                price.trade_date,
                {
                    "current_price": to_decimal(current_price),
                    "high_52w": to_decimal(high_52w),
                    "low_52w": to_decimal(low_52w),
                    "percentile_52w": to_decimal(percentile_52w),
                    "high_all_time": to_decimal(high_all_time),
                    "low_all_time": to_decimal(low_all_time),
                    "percentile_all_time": to_decimal(percentile_all_time),
                    "level_52w": get_level(percentile_52w),
                    "level_all_time": get_level(percentile_all_time),
                },
            )
        )

    db.commit()
    for level in levels:
        db.refresh(level)
    return levels


def list_price_levels(db: Session, asset_id: int) -> list[PriceLevel]:
    get_asset_or_404(db, asset_id)
    return (
        db.query(PriceLevel)
        .filter(PriceLevel.asset_id == asset_id)
        .order_by(PriceLevel.trade_date.asc())
        .all()
    )


def get_latest_price_level(db: Session, asset_id: int) -> PriceLevel:
    get_asset_or_404(db, asset_id)
    price_level = (
        db.query(PriceLevel)
        .filter(PriceLevel.asset_id == asset_id)
        .order_by(PriceLevel.trade_date.desc(), PriceLevel.id.desc())
        .first()
    )
    if not price_level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Price level not found",
        )
    return price_level
