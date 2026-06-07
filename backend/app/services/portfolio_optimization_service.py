from collections import defaultdict
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.asset_score import AssetScore
from app.models.goal_strategy import GoalStrategy
from app.models.market import MarketSnapshot
from app.models.portfolio_optimization import (
    PortfolioOptimization,
    PortfolioOptimizationAsset,
)


ASSET_CAP = Decimal("20")
INDUSTRY_CAP = Decimal("40")


def money(value: float | int | Decimal) -> Decimal:
    return Decimal(str(round(float(value), 4))).quantize(Decimal("0.0001"))


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


def get_optimization_or_404(
    db: Session,
    user_id: int,
    optimization_id: int,
) -> PortfolioOptimization:
    optimization = (
        db.query(PortfolioOptimization)
        .filter(
            PortfolioOptimization.id == optimization_id,
            PortfolioOptimization.user_id == user_id,
        )
        .first()
    )
    if not optimization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio optimization not found",
        )
    return optimization


def get_market_state(db: Session) -> str:
    snapshot = (
        db.query(MarketSnapshot)
        .order_by(MarketSnapshot.snapshot_date.desc(), MarketSnapshot.id.desc())
        .first()
    )
    return snapshot.market_regime if snapshot else "unknown"


def strategy_bucket(strategy_type: str) -> str:
    if strategy_type == "Conservative ETF":
        return "Conservative"
    if strategy_type == "Balanced Growth":
        return "Balanced"
    return "Aggressive"


def target_asset_mix(strategy_type: str) -> dict[str, Decimal]:
    allocation = {
        "Conservative": {"etf": Decimal("70"), "stock": Decimal("20")},
        "Balanced": {"etf": Decimal("50"), "stock": Decimal("40")},
        "Aggressive": {"etf": Decimal("30"), "stock": Decimal("60")},
    }[strategy_bucket(strategy_type)]
    investable_total = sum(allocation.values(), Decimal("0"))
    return {key: money(value / investable_total * 100) for key, value in allocation.items()}


def expected_risk_for_strategy(strategy_type: str) -> Decimal:
    return {
        "Conservative": Decimal("10"),
        "Balanced": Decimal("20"),
        "Aggressive": Decimal("35"),
    }[strategy_bucket(strategy_type)]


def latest_score_subquery(db: Session):
    return (
        db.query(
            AssetScore.asset_id.label("asset_id"),
            func.max(AssetScore.trade_date).label("trade_date"),
        )
        .group_by(AssetScore.asset_id)
        .subquery()
    )


def eligible_assets(db: Session, asset_type: str) -> list[tuple[Asset, AssetScore]]:
    latest_scores = latest_score_subquery(db)
    rows = (
        db.query(Asset, AssetScore)
        .join(AssetScore, AssetScore.asset_id == Asset.id)
        .join(
            latest_scores,
            (AssetScore.asset_id == latest_scores.c.asset_id)
            & (AssetScore.trade_date == latest_scores.c.trade_date),
        )
        .filter(
            Asset.asset_type == asset_type,
            Asset.is_active.is_(True),
            AssetScore.rating.in_(("strong_buy", "buy")),
        )
        .order_by(AssetScore.final_score.desc(), AssetScore.id.asc())
        .all()
    )
    return rows


def weighted_allocations(
    rows: list[tuple[Asset, AssetScore]],
    target_percent: Decimal,
) -> dict[int, Decimal]:
    if not rows or target_percent <= 0:
        return {}
    total_score = sum((Decimal(row[1].final_score) for row in rows), Decimal("0"))
    if total_score <= 0:
        even_weight = target_percent / len(rows)
        return {row[0].id: money(even_weight) for row in rows}
    return {
        row[0].id: money(Decimal(row[1].final_score) / total_score * target_percent)
        for row in rows
    }


def cap_and_redistribute(
    allocations: dict[int, Decimal],
    asset_by_id: dict[int, Asset],
) -> dict[int, Decimal]:
    if not allocations:
        return allocations

    for _ in range(20):
        changed = False
        industry_totals: dict[int | None, Decimal] = defaultdict(lambda: Decimal("0"))
        for asset_id, percent in allocations.items():
            industry_totals[asset_by_id[asset_id].industry_id] += percent

        capped_ids = set()
        excess = Decimal("0")
        for asset_id, percent in list(allocations.items()):
            asset = asset_by_id[asset_id]
            cap = ASSET_CAP
            industry_total = industry_totals[asset.industry_id]
            if industry_total > INDUSTRY_CAP and percent > 0:
                cap = min(cap, money(percent * INDUSTRY_CAP / industry_total))
            if percent > cap:
                excess += percent - cap
                allocations[asset_id] = cap
                capped_ids.add(asset_id)
                changed = True

        if excess <= 0 or not changed:
            break

        recipients = [
            asset_id
            for asset_id, percent in allocations.items()
            if asset_id not in capped_ids and percent < ASSET_CAP
        ]
        if not recipients:
            break
        recipient_total = sum((allocations[asset_id] for asset_id in recipients), Decimal("0"))
        for asset_id in recipients:
            share = (
                allocations[asset_id] / recipient_total if recipient_total else Decimal("1") / len(recipients)
            )
            allocations[asset_id] = money(min(ASSET_CAP, allocations[asset_id] + (excess * share)))

    total = sum(allocations.values(), Decimal("0"))
    if total and total != Decimal("100.0000"):
        adjustment = money(Decimal("100") - total)
        adjustable = min(allocations, key=lambda asset_id: allocations[asset_id])
        allocations[adjustable] = money(allocations[adjustable] + adjustment)
    return allocations


def recommendation_type(asset: Asset) -> str:
    if asset.asset_type == "etf":
        return "core"
    return "growth"


def generate_portfolio_optimization(db: Session, user_id: int) -> PortfolioOptimization:
    goal_strategy = get_latest_goal_strategy_or_404(db, user_id)
    mix = target_asset_mix(goal_strategy.strategy_type)
    etf_rows = eligible_assets(db, "etf")
    stock_rows = eligible_assets(db, "stock")
    rows = etf_rows + stock_rows
    asset_by_id = {asset.id: asset for asset, _score in rows}
    score_by_id = {asset.id: score for asset, score in rows}
    allocations = {}
    allocations.update(weighted_allocations(etf_rows, mix["etf"]))
    allocations.update(weighted_allocations(stock_rows, mix["stock"]))
    allocations = cap_and_redistribute(allocations, asset_by_id)

    selected_scores = [float(score_by_id[asset_id].final_score) for asset_id in allocations]
    expected_return = money((sum(selected_scores) / len(selected_scores) / 5) if selected_scores else 0)
    expected_risk = money(expected_risk_for_strategy(goal_strategy.strategy_type))
    expected_sharpe = money(expected_return / expected_risk) if expected_risk else money(0)

    optimization = PortfolioOptimization(
        user_id=user_id,
        portfolio_name=f"{goal_strategy.strategy_type} Optimized Portfolio",
        market_state=get_market_state(db),
        strategy_type=goal_strategy.strategy_type,
        risk_level=strategy_bucket(goal_strategy.strategy_type),
        total_capital=money(goal_strategy.current_capital),
        expected_return=expected_return,
        expected_risk=expected_risk,
        expected_sharpe=expected_sharpe,
    )
    db.add(optimization)
    db.flush()

    for asset_id, allocation_percent in allocations.items():
        asset = asset_by_id[asset_id]
        score = score_by_id[asset_id]
        db.add(
            PortfolioOptimizationAsset(
                optimization_id=optimization.id,
                asset_id=asset_id,
                allocation_percent=money(allocation_percent),
                allocation_amount=money(goal_strategy.current_capital * allocation_percent / 100),
                asset_score=money(score.final_score),
                recommendation_type=recommendation_type(asset),
            )
        )

    db.commit()
    db.refresh(optimization)
    return optimization


def list_portfolio_optimizations(db: Session, user_id: int) -> list[PortfolioOptimization]:
    return (
        db.query(PortfolioOptimization)
        .filter(PortfolioOptimization.user_id == user_id)
        .order_by(PortfolioOptimization.created_at.desc(), PortfolioOptimization.id.desc())
        .all()
    )


def get_latest_portfolio_optimization(db: Session, user_id: int) -> PortfolioOptimization:
    optimization = (
        db.query(PortfolioOptimization)
        .filter(PortfolioOptimization.user_id == user_id)
        .order_by(PortfolioOptimization.created_at.desc(), PortfolioOptimization.id.desc())
        .first()
    )
    if not optimization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio optimization not found",
        )
    return optimization


def list_portfolio_optimization_assets(
    db: Session,
    user_id: int,
    optimization_id: int,
) -> list[PortfolioOptimizationAsset]:
    get_optimization_or_404(db, user_id, optimization_id)
    return (
        db.query(PortfolioOptimizationAsset)
        .filter(PortfolioOptimizationAsset.optimization_id == optimization_id)
        .order_by(PortfolioOptimizationAsset.allocation_percent.desc())
        .all()
    )
