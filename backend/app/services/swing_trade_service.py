from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.asset_score import AssetScore
from app.models.indicator import TechnicalIndicator
from app.models.industry import IndustryMomentum
from app.models.price_level import PriceLevel
from app.models.swing_trade import SwingTradeSetup
from app.models.trade_plan import TradePlan


def money(value: float | int | Decimal) -> Decimal:
    return Decimal(str(round(float(value), 4))).quantize(Decimal("0.0001"))


def get_asset_or_404(db: Session, asset_id: int) -> Asset:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return asset


def get_latest_or_404(db: Session, model, asset_id: int, label: str):
    row = (
        db.query(model)
        .filter(model.asset_id == asset_id)
        .order_by(model.trade_date.desc(), model.id.desc())
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{label} not found")
    return row


def get_latest_industry_momentum(db: Session, asset: Asset):
    if asset.industry_id is None:
        return None
    return (
        db.query(IndustryMomentum)
        .filter(IndustryMomentum.industry_id == asset.industry_id)
        .order_by(IndustryMomentum.snapshot_date.desc(), IndustryMomentum.id.desc())
        .first()
    )


def determine_setup_type(
    asset_score: AssetScore,
    indicator: TechnicalIndicator,
    price_level: PriceLevel,
    industry_momentum: IndustryMomentum | None,
) -> str:
    current_price = float(price_level.current_price)
    high_52w = float(price_level.high_52w)
    trend_score = float(industry_momentum.trend_score) if industry_momentum else 0
    if current_price > high_52w:
        return "breakout"
    if (
        asset_score.rating == "strong_buy"
        and price_level.level_52w in ("low", "normal")
        and indicator.is_uptrend
    ):
        return "pullback"
    if asset_score.rating == "strong_buy" and price_level.level_52w == "high" and trend_score >= 80:
        return "trend_follow"
    return "mean_reversion"


def calculate_entry_zone(
    setup_type: str,
    current_price: float,
    ma20: float | None,
    high_52w: float,
) -> tuple[Decimal, Decimal]:
    if setup_type == "pullback" and ma20 is not None:
        return money(ma20), money(ma20 * 1.02)
    if setup_type == "trend_follow":
        return money(current_price), money(current_price * 1.01)
    if setup_type == "breakout":
        return money(high_52w), money(high_52w * 1.02)
    base_price = ma20 if ma20 is not None else current_price
    return money(base_price * 0.98), money(base_price * 1.02)


def holding_days_for_setup(setup_type: str) -> int:
    return {
        "pullback": 45,
        "trend_follow": 90,
        "breakout": 60,
        "mean_reversion": 30,
    }[setup_type]


def confidence_level(score: float) -> str:
    if score >= 80:
        return "high"
    if score >= 60:
        return "medium"
    return "low"


def build_reason(setup_type: str, price_level: PriceLevel, indicator: TechnicalIndicator) -> str:
    trend_text = "目前處於上升趨勢" if indicator.is_uptrend else "目前趨勢尚未明確"
    level_text = f"價格位於 52 週 {price_level.level_52w} 區間"
    strategy_text = {
        "pullback": "建議採用 Pullback Strategy。",
        "trend_follow": "建議採用 Trend Follow Strategy。",
        "breakout": "價格突破 52 週高點，建議採用 Breakout Strategy。",
        "mean_reversion": "建議採用 Mean Reversion Strategy。",
    }[setup_type]
    return f"{trend_text}，{level_text}，產業動能納入評估，{strategy_text}"


def generate_swing_setup(db: Session, asset_id: int) -> SwingTradeSetup:
    asset = get_asset_or_404(db, asset_id)
    asset_score = get_latest_or_404(db, AssetScore, asset_id, "Asset score")
    indicator = get_latest_or_404(db, TechnicalIndicator, asset_id, "Technical indicator")
    price_level = get_latest_or_404(db, PriceLevel, asset_id, "Price level")
    trade_plan = get_latest_or_404(db, TradePlan, asset_id, "Trade plan")
    industry_momentum = get_latest_industry_momentum(db, asset)

    setup_type = determine_setup_type(asset_score, indicator, price_level, industry_momentum)
    current_price = float(price_level.current_price)
    ma20 = float(indicator.ma20) if indicator.ma20 is not None else None
    ma60 = float(indicator.ma60) if indicator.ma60 is not None else None
    high_52w = float(price_level.high_52w)
    entry_low, entry_high = calculate_entry_zone(setup_type, current_price, ma20, high_52w)
    industry_score = float(asset_score.industry_score)
    factor_score = float(asset_score.factor_score)
    swing_score = (
        (float(asset_score.final_score) * 0.6)
        + (industry_score * 0.2)
        + (factor_score * 0.2)
    )
    stop_loss_price = (ma60 * 0.97) if ma60 is not None else (current_price * 0.90)

    data = {
        "current_price": money(current_price),
        "entry_zone_low": entry_low,
        "entry_zone_high": entry_high,
        "add_zone_1": money(entry_low * Decimal("0.95")),
        "add_zone_2": money(entry_low * Decimal("0.90")),
        "stop_loss_price": money(stop_loss_price),
        "target_price_1": money(current_price * 1.12),
        "target_price_2": money(current_price * 1.25),
        "expected_holding_days": holding_days_for_setup(setup_type),
        "swing_score": money(swing_score),
        "confidence_level": confidence_level(swing_score),
        "setup_type": setup_type,
        "reason": build_reason(setup_type, price_level, indicator),
    }
    setup = (
        db.query(SwingTradeSetup)
        .filter(
            SwingTradeSetup.asset_id == asset_id,
            SwingTradeSetup.trade_date == asset_score.trade_date,
        )
        .first()
    )
    if setup:
        for field, value in data.items():
            setattr(setup, field, value)
    else:
        setup = SwingTradeSetup(
            asset_id=asset_id,
            trade_date=asset_score.trade_date,
            **data,
        )
        db.add(setup)

    db.commit()
    db.refresh(setup)
    return setup


def get_latest_swing_setup(db: Session, asset_id: int) -> SwingTradeSetup:
    get_asset_or_404(db, asset_id)
    setup = (
        db.query(SwingTradeSetup)
        .filter(SwingTradeSetup.asset_id == asset_id)
        .order_by(SwingTradeSetup.trade_date.desc(), SwingTradeSetup.id.desc())
        .first()
    )
    if not setup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Swing setup not found")
    return setup


def list_swing_setups(db: Session) -> list[SwingTradeSetup]:
    return (
        db.query(SwingTradeSetup)
        .order_by(SwingTradeSetup.trade_date.desc(), SwingTradeSetup.id.desc())
        .all()
    )


def rank_swing_setups(db: Session) -> list[SwingTradeSetup]:
    return db.query(SwingTradeSetup).order_by(SwingTradeSetup.swing_score.desc(), SwingTradeSetup.id.asc()).all()
