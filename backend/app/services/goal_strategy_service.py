from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.asset_score import AssetScore
from app.models.goal_strategy import GoalStrategy, GoalStrategyRecommendation
from app.models.user_goal import UserGoal
from app.services.settings import get_or_create_user_setting


def to_decimal(value: float | int | Decimal) -> Decimal:
    return Decimal(str(round(float(value), 4))).quantize(Decimal("0.0001"))


def get_latest_goal_or_404(db: Session, user_id: int) -> UserGoal:
    goal = (
        db.query(UserGoal)
        .filter(UserGoal.user_id == user_id)
        .order_by(UserGoal.created_at.desc(), UserGoal.id.desc())
        .first()
    )
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )
    return goal


def get_goal_strategy_or_404(
    db: Session,
    user_id: int,
    goal_strategy_id: int,
) -> GoalStrategy:
    strategy = (
        db.query(GoalStrategy)
        .filter(GoalStrategy.id == goal_strategy_id, GoalStrategy.user_id == user_id)
        .first()
    )
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal strategy not found",
        )
    return strategy


def calculate_required_returns(
    current_capital: float,
    target_capital: float,
    target_date: date,
) -> tuple[Decimal, Decimal]:
    today = date.today()
    days = max((target_date - today).days, 1)
    years = days / 365
    months = max(days / 30.4375, 1)
    annual_return = ((target_capital / current_capital) ** (1 / years) - 1) * 100
    monthly_return = ((target_capital / current_capital) ** (1 / months) - 1) * 100
    return to_decimal(annual_return), to_decimal(monthly_return)


def determine_strategy_type(required_annual_return: Decimal) -> str:
    value = float(required_annual_return)
    if value <= 10:
        return "Conservative ETF"
    if value <= 20:
        return "Balanced Growth"
    if value <= 35:
        return "Aggressive Growth"
    return "High Risk Target"


def determine_allocation(strategy_type: str, allow_crypto: bool) -> dict[str, Decimal]:
    allocation_by_strategy = {
        "Conservative ETF": {"etf": 80, "stock": 15, "crypto": 0, "cash": 5},
        "Balanced Growth": {"etf": 50, "stock": 40, "crypto": 0, "cash": 10},
        "Aggressive Growth": {"etf": 30, "stock": 60, "crypto": 0, "cash": 10},
        "High Risk Target": {"etf": 20, "stock": 50, "crypto": 20, "cash": 10},
    }
    allocation = allocation_by_strategy[strategy_type].copy()
    if not allow_crypto and allocation["crypto"] > 0:
        crypto_ratio = allocation["crypto"]
        allocation["crypto"] = 0
        allocation["etf"] += crypto_ratio / 2
        allocation["stock"] += crypto_ratio / 2
    return {key: to_decimal(value) for key, value in allocation.items()}


def get_probability_score(required_annual_return: Decimal) -> Decimal:
    value = float(required_annual_return)
    if value <= 10:
        return Decimal("90")
    if value <= 20:
        return Decimal("75")
    if value <= 35:
        return Decimal("55")
    return Decimal("30")


def latest_score_subquery(db: Session):
    return (
        db.query(
            AssetScore.asset_id.label("asset_id"),
            func.max(AssetScore.trade_date).label("trade_date"),
        )
        .group_by(AssetScore.asset_id)
        .subquery()
    )


def find_top_asset(
    db: Session,
    asset_type: str,
    allow_penny_stock: bool,
    allow_crypto: bool,
    exclude_asset_ids: set[int] | None = None,
) -> Asset | None:
    exclude_asset_ids = exclude_asset_ids or set()
    latest_scores = latest_score_subquery(db)
    query = (
        db.query(Asset)
        .join(AssetScore, AssetScore.asset_id == Asset.id)
        .join(
            latest_scores,
            (AssetScore.asset_id == latest_scores.c.asset_id)
            & (AssetScore.trade_date == latest_scores.c.trade_date),
        )
        .filter(Asset.asset_type == asset_type, Asset.is_active.is_(True))
        .order_by(AssetScore.final_score.desc(), AssetScore.id.asc())
    )
    if not allow_penny_stock:
        query = query.filter(Asset.is_penny_stock.is_(False))
    if not allow_crypto:
        query = query.filter(Asset.asset_type != "crypto")
    if exclude_asset_ids:
        query = query.filter(~Asset.id.in_(exclude_asset_ids))
    return query.first()


def create_recommendations(
    db: Session,
    strategy: GoalStrategy,
    allow_penny_stock: bool,
    allow_crypto: bool,
) -> None:
    selected_ids: set[int] = set()
    core_asset = find_top_asset(db, "etf", allow_penny_stock, allow_crypto)
    if core_asset and strategy.etf_ratio > 0:
        selected_ids.add(core_asset.id)
        db.add(
            GoalStrategyRecommendation(
                goal_strategy_id=strategy.id,
                asset_id=core_asset.id,
                recommendation_type="core",
                allocation_percent=strategy.etf_ratio,
                reason="最高分 ETF，作為目標策略核心配置。",
            )
        )

    growth_asset = find_top_asset(
        db,
        "stock",
        allow_penny_stock,
        allow_crypto,
        selected_ids,
    )
    if growth_asset and strategy.stock_ratio > 0:
        selected_ids.add(growth_asset.id)
        db.add(
            GoalStrategyRecommendation(
                goal_strategy_id=strategy.id,
                asset_id=growth_asset.id,
                recommendation_type="growth",
                allocation_percent=strategy.stock_ratio,
                reason="最高分股票，作為成長配置。",
            )
        )

    aggressive_asset_type = "crypto" if allow_crypto and strategy.crypto_ratio > 0 else "stock"
    aggressive_asset = find_top_asset(
        db,
        aggressive_asset_type,
        allow_penny_stock,
        allow_crypto,
        selected_ids,
    )
    aggressive_allocation = strategy.crypto_ratio if aggressive_asset_type == "crypto" else min(
        Decimal(strategy.stock_ratio),
        Decimal("20"),
    )
    if aggressive_asset and aggressive_allocation > 0:
        db.add(
            GoalStrategyRecommendation(
                goal_strategy_id=strategy.id,
                asset_id=aggressive_asset.id,
                recommendation_type="aggressive",
                allocation_percent=aggressive_allocation,
                reason="高分高成長標的，作為進取配置。",
            )
        )


def generate_goal_strategy(db: Session, user_id: int) -> GoalStrategy:
    goal = get_latest_goal_or_404(db, user_id)
    setting = get_or_create_user_setting(db, user_id)
    required_annual_return, required_monthly_return = calculate_required_returns(
        goal.current_capital,
        goal.target_capital,
        goal.target_date,
    )
    strategy_type = determine_strategy_type(required_annual_return)
    allocation = determine_allocation(strategy_type, setting.allow_crypto)
    strategy = GoalStrategy(
        user_id=user_id,
        goal_id=goal.id,
        current_capital=to_decimal(goal.current_capital),
        target_capital=to_decimal(goal.target_capital),
        target_date=goal.target_date,
        required_annual_return=required_annual_return,
        required_monthly_return=required_monthly_return,
        strategy_type=strategy_type,
        risk_level=setting.risk_level,
        etf_ratio=allocation["etf"],
        stock_ratio=allocation["stock"],
        crypto_ratio=allocation["crypto"],
        cash_ratio=allocation["cash"],
        probability_score=to_decimal(get_probability_score(required_annual_return)),
    )
    db.add(strategy)
    db.flush()
    create_recommendations(
        db,
        strategy,
        allow_penny_stock=setting.allow_penny_stock,
        allow_crypto=setting.allow_crypto,
    )
    db.commit()
    db.refresh(strategy)
    return strategy


def list_goal_strategies(db: Session, user_id: int) -> list[GoalStrategy]:
    return (
        db.query(GoalStrategy)
        .filter(GoalStrategy.user_id == user_id)
        .order_by(GoalStrategy.created_at.desc(), GoalStrategy.id.desc())
        .all()
    )


def get_latest_goal_strategy(db: Session, user_id: int) -> GoalStrategy:
    strategy = (
        db.query(GoalStrategy)
        .filter(GoalStrategy.user_id == user_id)
        .order_by(GoalStrategy.created_at.desc(), GoalStrategy.id.desc())
        .first()
    )
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal strategy not found",
        )
    return strategy


def list_goal_strategy_recommendations(
    db: Session,
    user_id: int,
    goal_strategy_id: int,
) -> list[GoalStrategyRecommendation]:
    get_goal_strategy_or_404(db, user_id, goal_strategy_id)
    return (
        db.query(GoalStrategyRecommendation)
        .filter(GoalStrategyRecommendation.goal_strategy_id == goal_strategy_id)
        .order_by(GoalStrategyRecommendation.allocation_percent.desc())
        .all()
    )
