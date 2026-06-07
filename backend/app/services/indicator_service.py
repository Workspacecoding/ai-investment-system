from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.indicator import TechnicalIndicator
from app.models.price import AssetPrice
from app.schemas.indicators import AssetPriceCreate


def get_asset_or_404(db: Session, asset_id: int) -> Asset:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )
    return asset


def to_decimal(value: float | int | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(round(value, 4)))


def create_or_update_price(
    db: Session,
    asset_id: int,
    price_create: AssetPriceCreate,
) -> AssetPrice:
    get_asset_or_404(db, asset_id)
    price = (
        db.query(AssetPrice)
        .filter(
            AssetPrice.asset_id == asset_id,
            AssetPrice.trade_date == price_create.trade_date,
        )
        .first()
    )

    data = price_create.model_dump()
    if price:
        for field, value in data.items():
            setattr(price, field, value)
    else:
        price = AssetPrice(asset_id=asset_id, **data)
        db.add(price)

    db.commit()
    db.refresh(price)
    return price


def list_prices(db: Session, asset_id: int) -> list[AssetPrice]:
    get_asset_or_404(db, asset_id)
    return (
        db.query(AssetPrice)
        .filter(AssetPrice.asset_id == asset_id)
        .order_by(AssetPrice.trade_date.asc())
        .all()
    )


def average(values: list[float]) -> float:
    return sum(values) / len(values)


def calculate_rsi(closes: list[float]) -> float | None:
    if len(closes) < 15:
        return None

    changes = [closes[index] - closes[index - 1] for index in range(1, len(closes))]
    recent_changes = changes[-14:]
    gains = [change for change in recent_changes if change > 0]
    losses = [abs(change) for change in recent_changes if change < 0]
    avg_gain = sum(gains) / 14
    avg_loss = sum(losses) / 14

    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def create_or_update_technical_indicator(
    db: Session,
    asset_id: int,
    trade_date,
    indicator_data: dict,
) -> TechnicalIndicator:
    indicator = (
        db.query(TechnicalIndicator)
        .filter(
            TechnicalIndicator.asset_id == asset_id,
            TechnicalIndicator.trade_date == trade_date,
        )
        .first()
    )
    if indicator:
        for field, value in indicator_data.items():
            setattr(indicator, field, value)
    else:
        indicator = TechnicalIndicator(
            asset_id=asset_id,
            trade_date=trade_date,
            **indicator_data,
        )
        db.add(indicator)

    db.commit()
    db.refresh(indicator)
    return indicator


def calculate_indicators(db: Session, asset_id: int) -> list[TechnicalIndicator]:
    prices = list_prices(db, asset_id)
    existing_indicators = {
        indicator.trade_date: indicator
        for indicator in db.query(TechnicalIndicator)
        .filter(TechnicalIndicator.asset_id == asset_id)
        .all()
    }
    indicators: list[TechnicalIndicator] = []

    for index, price in enumerate(prices):
        window_prices = prices[: index + 1]
        closes = [float(item.close_price) for item in window_prices]
        volumes = [float(item.volume) for item in window_prices]
        close_price = float(price.close_price)
        previous_close = float(prices[index - 1].close_price) if index > 0 else None

        ma5 = average(closes[-5:]) if len(closes) >= 5 else None
        ma10 = average(closes[-10:]) if len(closes) >= 10 else None
        ma20 = average(closes[-20:]) if len(closes) >= 20 else None
        ma60 = average(closes[-60:]) if len(closes) >= 60 else None
        volume_ma5 = average(volumes[-5:]) if len(volumes) >= 5 else None
        volume_ratio = float(price.volume) / volume_ma5 if volume_ma5 else None
        change_percent = (
            ((close_price - previous_close) / previous_close) * 100
            if previous_close
            else None
        )
        rsi14 = calculate_rsi(closes)
        is_uptrend = bool(ma20 is not None and ma5 is not None and close_price > ma20 and ma5 > ma20)
        is_overbought = bool(rsi14 is not None and rsi14 >= 70)
        is_volume_spike = bool(volume_ratio is not None and volume_ratio >= 2)

        indicator_data = {
            "ma5": to_decimal(ma5),
            "ma10": to_decimal(ma10),
            "ma20": to_decimal(ma20),
            "ma60": to_decimal(ma60),
            "rsi14": to_decimal(rsi14),
            "volume_ma5": to_decimal(volume_ma5),
            "volume_ratio": to_decimal(volume_ratio),
            "change_percent": to_decimal(change_percent),
            "is_uptrend": is_uptrend,
            "is_overbought": is_overbought,
            "is_volume_spike": is_volume_spike,
        }
        indicator = existing_indicators.get(price.trade_date)
        if indicator:
            for field, value in indicator_data.items():
                setattr(indicator, field, value)
        else:
            indicator = TechnicalIndicator(
                asset_id=asset_id,
                trade_date=price.trade_date,
                **indicator_data,
            )
            db.add(indicator)
        indicators.append(indicator)

    db.commit()
    for indicator in indicators:
        db.refresh(indicator)

    return indicators


def list_indicators(db: Session, asset_id: int) -> list[TechnicalIndicator]:
    get_asset_or_404(db, asset_id)
    return (
        db.query(TechnicalIndicator)
        .filter(TechnicalIndicator.asset_id == asset_id)
        .order_by(TechnicalIndicator.trade_date.asc())
        .all()
    )
