from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import case
from sqlalchemy.orm import Session

from app.models.asset_score import AssetScore
from app.models.indicator import TechnicalIndicator
from app.models.price import AssetPrice
from app.models.price_level import PriceLevel
from app.models.trade_plan import TradePlan


def to_decimal(value: float | int | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(round(float(value), 4)))


def get_latest_or_404(db: Session, model, asset_id: int, label: str):
    row = (
        db.query(model)
        .filter(model.asset_id == asset_id)
        .order_by(model.trade_date.desc(), model.id.desc())
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{label} not found",
        )
    return row


def determine_action(rating: str, level_52w: str) -> str:
    if rating == "strong_buy" and level_52w != "very_high":
        return "buy"
    if rating == "buy" and level_52w in ("normal", "low"):
        return "buy"
    if rating == "buy" and level_52w in ("high", "very_high"):
        return "watch"
    if rating == "watch":
        return "watch"
    if rating == "weak":
        return "hold"
    if rating == "avoid":
        return "avoid"
    return "watch"


def determine_strategy_type(rating: str, level_52w: str, is_uptrend: bool) -> str:
    if rating == "avoid":
        return "avoid"
    if level_52w in ("low", "normal") and is_uptrend:
        return "pullback_buy"
    if level_52w == "high" and rating == "strong_buy":
        return "trend_follow"
    if level_52w == "very_high":
        return "wait_for_pullback"
    return "monitor"


def build_reason(
    final_score: float,
    rating: str,
    level_52w: str,
    is_uptrend: bool,
    strategy_type: str,
) -> str:
    trend_text = "技術面呈現上升趨勢" if is_uptrend else "技術面尚未呈現明確上升趨勢"
    return (
        f"此標的目前評分為 {round(final_score, 2)}，屬於 {rating}。"
        f"價格位於 52 週 {level_52w} 區間，且{trend_text}，"
        f"因此系統建議採用 {strategy_type} 策略。"
    )


def generate_trade_plan(db: Session, asset_id: int) -> TradePlan:
    asset_score = get_latest_or_404(db, AssetScore, asset_id, "Asset score")
    asset_price = get_latest_or_404(db, AssetPrice, asset_id, "Asset price")
    indicator = get_latest_or_404(db, TechnicalIndicator, asset_id, "Technical indicator")
    price_level = get_latest_or_404(db, PriceLevel, asset_id, "Price level")

    current_price = float(asset_price.close_price)
    ma20 = float(indicator.ma20) if indicator.ma20 is not None else None
    rating = asset_score.rating
    level_52w = price_level.level_52w
    action = determine_action(rating, level_52w)
    entry_price = current_price if action == "buy" else ma20 if action == "watch" else None
    stop_loss_price = (ma20 * 0.95) if ma20 is not None else (current_price * 0.92)
    take_profit_1 = current_price * 1.08
    take_profit_2 = current_price * 1.15
    max_loss_percent = ((current_price - stop_loss_price) / current_price) * 100
    expected_return_percent = ((take_profit_1 - current_price) / current_price) * 100
    risk_reward_ratio = (
        expected_return_percent / max_loss_percent if max_loss_percent else 0
    )
    strategy_type = determine_strategy_type(rating, level_52w, indicator.is_uptrend)
    final_score = float(asset_score.final_score)

    plan_data = {
        "final_score": to_decimal(final_score),
        "rating": rating,
        "action": action,
        "current_price": to_decimal(current_price),
        "entry_price": to_decimal(entry_price),
        "stop_loss_price": to_decimal(stop_loss_price),
        "take_profit_1": to_decimal(take_profit_1),
        "take_profit_2": to_decimal(take_profit_2),
        "expected_return_percent": to_decimal(expected_return_percent),
        "max_loss_percent": to_decimal(max_loss_percent),
        "risk_reward_ratio": to_decimal(risk_reward_ratio),
        "strategy_type": strategy_type,
        "reason": build_reason(
            final_score,
            rating,
            level_52w,
            indicator.is_uptrend,
            strategy_type,
        ),
    }

    trade_plan = (
        db.query(TradePlan)
        .filter(
            TradePlan.asset_id == asset_id,
            TradePlan.trade_date == asset_score.trade_date,
        )
        .first()
    )
    if trade_plan:
        for field, value in plan_data.items():
            setattr(trade_plan, field, value)
    else:
        trade_plan = TradePlan(
            asset_id=asset_id,
            trade_date=asset_score.trade_date,
            **plan_data,
        )
        db.add(trade_plan)

    db.commit()
    db.refresh(trade_plan)
    return trade_plan


def get_latest_trade_plan(db: Session, asset_id: int) -> TradePlan:
    trade_plan = (
        db.query(TradePlan)
        .filter(TradePlan.asset_id == asset_id)
        .order_by(TradePlan.trade_date.desc(), TradePlan.id.desc())
        .first()
    )
    if not trade_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade plan not found",
        )
    return trade_plan


def list_trade_plans(db: Session) -> list[TradePlan]:
    return (
        db.query(TradePlan)
        .order_by(TradePlan.trade_date.desc(), TradePlan.final_score.desc())
        .all()
    )


def rank_trade_plans(db: Session) -> list[TradePlan]:
    action_priority = case((TradePlan.action == "buy", 0), else_=1)
    return (
        db.query(TradePlan)
        .order_by(
            action_priority.asc(),
            TradePlan.final_score.desc(),
            TradePlan.risk_reward_ratio.desc(),
            TradePlan.id.asc(),
        )
        .all()
    )
