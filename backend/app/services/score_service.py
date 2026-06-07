from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.asset_score import AssetScore
from app.models.factor import FactorScore
from app.models.industry import IndustryMomentum
from app.models.market import MarketSnapshot
from app.models.price_level import PriceLevel


MARKET_SCORE_BY_REGIME = {
    "bull": 90,
    "sideways": 60,
    "bear": 30,
}

PRICE_LEVEL_SCORE_BY_LEVEL = {
    "very_low": 90,
    "low": 75,
    "normal": 60,
    "high": 40,
    "very_high": 20,
}


def to_decimal(value: float | int) -> Decimal:
    return Decimal(str(round(float(value), 4)))


def get_rating(final_score: float) -> str:
    if final_score >= 80:
        return "strong_buy"
    if final_score >= 65:
        return "buy"
    if final_score >= 50:
        return "watch"
    if final_score >= 35:
        return "weak"
    return "avoid"


def get_asset_or_404(db: Session, asset_id: int) -> Asset:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )
    return asset


def get_latest_price_level_or_404(db: Session, asset_id: int) -> PriceLevel:
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


def get_market_score(db: Session, trade_date) -> float:
    snapshot = (
        db.query(MarketSnapshot)
        .filter(MarketSnapshot.snapshot_date <= trade_date)
        .order_by(MarketSnapshot.snapshot_date.desc(), MarketSnapshot.id.desc())
        .first()
    )
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Market snapshot not found",
        )
    return MARKET_SCORE_BY_REGIME[snapshot.market_regime]


def get_industry_score(db: Session, asset: Asset, trade_date) -> float:
    if asset.industry_id is None:
        return 0.0

    momentum = (
        db.query(IndustryMomentum)
        .filter(
            IndustryMomentum.industry_id == asset.industry_id,
            IndustryMomentum.snapshot_date <= trade_date,
        )
        .order_by(IndustryMomentum.snapshot_date.desc(), IndustryMomentum.id.desc())
        .first()
    )
    if not momentum:
        return 0.0
    return min(float(momentum.momentum_score), 100.0)


def get_factor_score(db: Session, asset_id: int, trade_date) -> float:
    average_score = (
        db.query(func.avg(FactorScore.factor_score))
        .filter(FactorScore.asset_id == asset_id, FactorScore.trade_date == trade_date)
        .scalar()
    )
    if average_score is None:
        return 0.0
    return float(average_score)


def calculate_asset_score(db: Session, asset_id: int) -> AssetScore:
    asset = get_asset_or_404(db, asset_id)
    price_level = get_latest_price_level_or_404(db, asset_id)
    trade_date = price_level.trade_date
    market_score = get_market_score(db, trade_date)
    industry_score = get_industry_score(db, asset, trade_date)
    factor_score = get_factor_score(db, asset_id, trade_date)
    price_level_score = PRICE_LEVEL_SCORE_BY_LEVEL[price_level.level_52w]
    final_score = (
        (market_score * 0.2)
        + (industry_score * 0.25)
        + (factor_score * 0.35)
        + (price_level_score * 0.2)
    )
    rating = get_rating(final_score)

    score = (
        db.query(AssetScore)
        .filter(AssetScore.asset_id == asset_id, AssetScore.trade_date == trade_date)
        .first()
    )
    score_data = {
        "market_score": to_decimal(market_score),
        "industry_score": to_decimal(industry_score),
        "factor_score": to_decimal(factor_score),
        "price_level_score": to_decimal(price_level_score),
        "final_score": to_decimal(final_score),
        "rating": rating,
    }
    if score:
        for field, value in score_data.items():
            setattr(score, field, value)
    else:
        score = AssetScore(asset_id=asset_id, trade_date=trade_date, **score_data)
        db.add(score)

    db.commit()
    db.refresh(score)
    return score


def get_latest_asset_score(db: Session, asset_id: int) -> AssetScore:
    get_asset_or_404(db, asset_id)
    score = (
        db.query(AssetScore)
        .filter(AssetScore.asset_id == asset_id)
        .order_by(AssetScore.trade_date.desc(), AssetScore.id.desc())
        .first()
    )
    if not score:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset score not found",
        )
    return score


def calculate_ranking(db: Session) -> list[AssetScore]:
    latest_dates = (
        db.query(
            AssetScore.asset_id.label("asset_id"),
            func.max(AssetScore.trade_date).label("trade_date"),
        )
        .group_by(AssetScore.asset_id)
        .subquery()
    )
    return (
        db.query(AssetScore)
        .join(
            latest_dates,
            (AssetScore.asset_id == latest_dates.c.asset_id)
            & (AssetScore.trade_date == latest_dates.c.trade_date),
        )
        .order_by(AssetScore.final_score.desc(), AssetScore.id.asc())
        .all()
    )
