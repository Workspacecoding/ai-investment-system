from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.asset_score import AssetScore
from app.models.goal_strategy import GoalStrategy
from app.models.paper_trading import PaperPortfolio
from app.models.profit_allocation import (
    ProfitAllocation,
    ProfitAllocationRecommendation,
)
from app.models.trade_plan import TradePlan
from app.services.settings import get_or_create_user_setting


def money(value: float | int | Decimal) -> Decimal:
    return Decimal(str(round(float(value), 4))).quantize(Decimal("0.0001"))


def get_portfolio_or_404(db: Session, user_id: int, portfolio_id: int) -> PaperPortfolio:
    portfolio = (
        db.query(PaperPortfolio)
        .filter(PaperPortfolio.id == portfolio_id, PaperPortfolio.user_id == user_id)
        .first()
    )
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper portfolio not found",
        )
    return portfolio


def get_latest_goal_strategy_or_404(db: Session, user_id: int) -> GoalStrategy:
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


def get_allocation_or_404(
    db: Session,
    user_id: int,
    allocation_id: int,
) -> ProfitAllocation:
    allocation = (
        db.query(ProfitAllocation)
        .filter(ProfitAllocation.id == allocation_id, ProfitAllocation.user_id == user_id)
        .first()
    )
    if not allocation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profit allocation not found",
        )
    return allocation


def determine_allocation_version(strategy_type: str) -> str:
    if strategy_type == "Conservative ETF":
        return "Conservative"
    if strategy_type == "Balanced Growth":
        return "Balanced"
    return "Aggressive"


def get_ratios(allocation_version: str) -> dict[str, Decimal]:
    ratios = {
        "Conservative": {
            "entertainment": 10,
            "core_asset": 50,
            "reinvest": 20,
            "cash": 20,
        },
        "Balanced": {
            "entertainment": 15,
            "core_asset": 35,
            "reinvest": 35,
            "cash": 15,
        },
        "Aggressive": {
            "entertainment": 10,
            "core_asset": 20,
            "reinvest": 60,
            "cash": 10,
        },
    }[allocation_version]
    return {key: money(value) for key, value in ratios.items()}


def latest_score_subquery(db: Session):
    return (
        db.query(
            AssetScore.asset_id.label("asset_id"),
            func.max(AssetScore.trade_date).label("trade_date"),
        )
        .group_by(AssetScore.asset_id)
        .subquery()
    )


def base_asset_filter(query, allow_crypto: bool, allow_penny_stock: bool):
    if not allow_crypto:
        query = query.filter(Asset.asset_type != "crypto")
    if not allow_penny_stock:
        query = query.filter(Asset.is_penny_stock.is_(False))
    return query


def top_core_assets(
    db: Session,
    allow_crypto: bool,
    allow_penny_stock: bool,
) -> list[Asset]:
    latest_scores = latest_score_subquery(db)
    query = (
        db.query(Asset)
        .join(AssetScore, AssetScore.asset_id == Asset.id)
        .join(
            latest_scores,
            (AssetScore.asset_id == latest_scores.c.asset_id)
            & (AssetScore.trade_date == latest_scores.c.trade_date),
        )
        .filter(Asset.asset_type == "etf", Asset.is_active.is_(True))
        .order_by(AssetScore.final_score.desc(), AssetScore.id.asc())
    )
    return base_asset_filter(query, allow_crypto, allow_penny_stock).limit(3).all()


def top_reinvest_assets(
    db: Session,
    allow_crypto: bool,
    allow_penny_stock: bool,
) -> list[Asset]:
    query = (
        db.query(Asset)
        .join(TradePlan, TradePlan.asset_id == Asset.id)
        .filter(TradePlan.action == "buy", Asset.is_active.is_(True))
        .order_by(TradePlan.final_score.desc(), TradePlan.id.asc())
    )
    return base_asset_filter(query, allow_crypto, allow_penny_stock).limit(5).all()


def top_speculative_assets(
    db: Session,
    allow_crypto: bool,
    allow_penny_stock: bool,
) -> list[Asset]:
    if not allow_crypto and not allow_penny_stock:
        return []
    latest_scores = latest_score_subquery(db)
    query = (
        db.query(Asset)
        .join(AssetScore, AssetScore.asset_id == Asset.id)
        .join(
            latest_scores,
            (AssetScore.asset_id == latest_scores.c.asset_id)
            & (AssetScore.trade_date == latest_scores.c.trade_date),
        )
        .filter(Asset.is_active.is_(True))
        .order_by(AssetScore.final_score.desc(), AssetScore.id.asc())
    )
    if allow_crypto and allow_penny_stock:
        query = query.filter((Asset.asset_type == "crypto") | (Asset.is_penny_stock.is_(True)))
    elif allow_crypto:
        query = query.filter(Asset.asset_type == "crypto")
    else:
        query = query.filter(Asset.is_penny_stock.is_(True))
    return query.limit(3).all()


def split_amount(total_amount: Decimal, count: int) -> Decimal:
    if count <= 0:
        return money(0)
    return money(total_amount / count)


def create_recommendations(
    db: Session,
    allocation: ProfitAllocation,
    allow_crypto: bool,
    allow_penny_stock: bool,
) -> None:
    core_assets = top_core_assets(db, allow_crypto, allow_penny_stock)
    core_amount = split_amount(allocation.core_asset_amount, len(core_assets))
    for asset in core_assets:
        db.add(
            ProfitAllocationRecommendation(
                allocation_id=allocation.id,
                asset_id=asset.id,
                recommendation_type="core",
                allocation_amount=core_amount,
                reason="核心 ETF 加碼標的，依 asset score 排序。",
            )
        )

    reinvest_assets = top_reinvest_assets(db, allow_crypto, allow_penny_stock)
    reinvest_amount = split_amount(allocation.reinvest_amount, len(reinvest_assets))
    for asset in reinvest_assets:
        db.add(
            ProfitAllocationRecommendation(
                allocation_id=allocation.id,
                asset_id=asset.id,
                recommendation_type="growth",
                allocation_amount=reinvest_amount,
                reason="Trade Plan 建議買入，適合作為再投資標的。",
            )
        )

    speculative_assets = top_speculative_assets(db, allow_crypto, allow_penny_stock)
    speculative_budget = money(allocation.reinvest_amount * Decimal("0.25"))
    speculative_amount = split_amount(speculative_budget, len(speculative_assets))
    for asset in speculative_assets:
        db.add(
            ProfitAllocationRecommendation(
                allocation_id=allocation.id,
                asset_id=asset.id,
                recommendation_type="speculative",
                allocation_amount=speculative_amount,
                reason="符合使用者風險設定的投機配置候選標的。",
            )
        )


def generate_profit_allocation(
    db: Session,
    user_id: int,
    portfolio_id: int,
    realized_profit: float,
) -> ProfitAllocation:
    get_portfolio_or_404(db, user_id, portfolio_id)
    goal_strategy = get_latest_goal_strategy_or_404(db, user_id)
    setting = get_or_create_user_setting(db, user_id)
    realized_profit_value = money(realized_profit)
    allocation_version = determine_allocation_version(goal_strategy.strategy_type)
    ratios = get_ratios(allocation_version)
    allocation = ProfitAllocation(
        user_id=user_id,
        portfolio_id=portfolio_id,
        realized_profit=realized_profit_value,
        entertainment_ratio=ratios["entertainment"],
        core_asset_ratio=ratios["core_asset"],
        reinvest_ratio=ratios["reinvest"],
        cash_ratio=ratios["cash"],
        entertainment_amount=money(realized_profit_value * ratios["entertainment"] / 100),
        core_asset_amount=money(realized_profit_value * ratios["core_asset"] / 100),
        reinvest_amount=money(realized_profit_value * ratios["reinvest"] / 100),
        cash_amount=money(realized_profit_value * ratios["cash"] / 100),
        allocation_version=allocation_version,
    )
    db.add(allocation)
    db.flush()
    create_recommendations(
        db,
        allocation,
        allow_crypto=setting.allow_crypto,
        allow_penny_stock=setting.allow_penny_stock,
    )
    db.commit()
    db.refresh(allocation)
    return allocation


def list_profit_allocations(db: Session, user_id: int) -> list[ProfitAllocation]:
    return (
        db.query(ProfitAllocation)
        .filter(ProfitAllocation.user_id == user_id)
        .order_by(ProfitAllocation.created_at.desc(), ProfitAllocation.id.desc())
        .all()
    )


def get_latest_profit_allocation(db: Session, user_id: int) -> ProfitAllocation:
    allocation = (
        db.query(ProfitAllocation)
        .filter(ProfitAllocation.user_id == user_id)
        .order_by(ProfitAllocation.created_at.desc(), ProfitAllocation.id.desc())
        .first()
    )
    if not allocation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profit allocation not found",
        )
    return allocation


def list_profit_allocation_recommendations(
    db: Session,
    user_id: int,
    allocation_id: int,
) -> list[ProfitAllocationRecommendation]:
    get_allocation_or_404(db, user_id, allocation_id)
    return (
        db.query(ProfitAllocationRecommendation)
        .filter(ProfitAllocationRecommendation.allocation_id == allocation_id)
        .order_by(
            ProfitAllocationRecommendation.recommendation_type.asc(),
            ProfitAllocationRecommendation.allocation_amount.desc(),
            ProfitAllocationRecommendation.id.asc(),
        )
        .all()
    )
