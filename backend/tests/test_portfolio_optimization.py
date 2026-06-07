import sys
from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.asset import Asset, RecommendedAsset, UserWatchlist  # noqa: E402
from app.models.asset_score import AssetScore  # noqa: E402
from app.models.goal_strategy import GoalStrategy, GoalStrategyRecommendation  # noqa: E402
from app.models.industry import Industry, IndustryMomentum  # noqa: E402
from app.models.market import MarketSnapshot  # noqa: E402
from app.models.portfolio_optimization import (  # noqa: E402
    PortfolioOptimization,
    PortfolioOptimizationAsset,
)
from app.models.user import User  # noqa: E402
from app.models.user_goal import UserGoal  # noqa: E402
from app.models.user_setting import UserSetting  # noqa: E402


client = TestClient(app)


def cleanup_user(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            optimization_ids = [
                item.id
                for item in db.query(PortfolioOptimization)
                .filter(PortfolioOptimization.user_id == user.id)
                .all()
            ]
            if optimization_ids:
                db.query(PortfolioOptimizationAsset).filter(
                    PortfolioOptimizationAsset.optimization_id.in_(optimization_ids)
                ).delete(synchronize_session=False)
                db.query(PortfolioOptimization).filter(
                    PortfolioOptimization.id.in_(optimization_ids)
                ).delete(synchronize_session=False)
            strategy_ids = [
                strategy.id
                for strategy in db.query(GoalStrategy)
                .filter(GoalStrategy.user_id == user.id)
                .all()
            ]
            if strategy_ids:
                db.query(GoalStrategyRecommendation).filter(
                    GoalStrategyRecommendation.goal_strategy_id.in_(strategy_ids)
                ).delete(synchronize_session=False)
                db.query(GoalStrategy).filter(GoalStrategy.id.in_(strategy_ids)).delete(
                    synchronize_session=False
                )
            db.query(UserGoal).filter(UserGoal.user_id == user.id).delete(
                synchronize_session=False
            )
            db.query(UserSetting).filter(UserSetting.user_id == user.id).delete(
                synchronize_session=False
            )
            db.query(UserWatchlist).filter(UserWatchlist.user_id == user.id).delete(
                synchronize_session=False
            )
            db.delete(user)
            db.commit()
    finally:
        db.close()


def cleanup_industry(code: str):
    db = SessionLocal()
    try:
        industry = db.query(Industry).filter(Industry.industry_code == code).first()
        if industry:
            db.query(IndustryMomentum).filter(
                IndustryMomentum.industry_id == industry.id
            ).delete(synchronize_session=False)
            db.delete(industry)
            db.commit()
    finally:
        db.close()


def cleanup_asset(symbol: str, market: str = "US"):
    db = SessionLocal()
    try:
        asset = db.query(Asset).filter(Asset.symbol == symbol, Asset.market == market).first()
        if asset:
            db.query(PortfolioOptimizationAsset).filter(
                PortfolioOptimizationAsset.asset_id == asset.id
            ).delete(synchronize_session=False)
            db.query(AssetScore).filter(AssetScore.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(UserWatchlist).filter(UserWatchlist.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(RecommendedAsset).filter(RecommendedAsset.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.delete(asset)
            db.commit()
    finally:
        db.close()


def cleanup_market_snapshot(snapshot_date: date):
    db = SessionLocal()
    try:
        db.query(MarketSnapshot).filter(
            MarketSnapshot.snapshot_date == snapshot_date
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def create_headers(email: str):
    cleanup_user(email)
    password = "12345678"
    register_response = client.post(
        "/register",
        json={"email": email, "password": password, "name": "Optimization User"},
    )
    assert register_response.status_code in (200, 201)
    login_response = client.post("/login", json={"email": email, "password": password})
    assert login_response.status_code == 200
    return {"Authorization": f"Bearer {login_response.json()['access_token']}"}


def get_user_id(email: str) -> int:
    db = SessionLocal()
    try:
        return db.query(User).filter(User.email == email).first().id
    finally:
        db.close()


def seed_goal_strategy(user_id: int):
    db = SessionLocal()
    try:
        goal = UserGoal(
            user_id=user_id,
            current_capital=10000,
            target_capital=15000,
            target_date=date(2099, 12, 31),
        )
        db.add(goal)
        db.flush()
        strategy = GoalStrategy(
            user_id=user_id,
            goal_id=goal.id,
            current_capital=10000,
            target_capital=15000,
            target_date=goal.target_date,
            required_annual_return=12,
            required_monthly_return=1,
            strategy_type="Balanced Growth",
            risk_level="balanced",
            etf_ratio=50,
            stock_ratio=40,
            crypto_ratio=0,
            cash_ratio=10,
            probability_score=75,
        )
        db.add(strategy)
        db.commit()
    finally:
        db.close()


def seed_industry(code: str) -> int:
    db = SessionLocal()
    try:
        industry = Industry(
            industry_code=code,
            industry_name=f"{code} Industry",
            market="US",
            description="Optimization industry",
        )
        db.add(industry)
        db.commit()
        db.refresh(industry)
        return industry.id
    finally:
        db.close()


def seed_asset_score(
    symbol: str,
    asset_type: str,
    industry_id: int,
    final_score: float,
    rating: str,
) -> int:
    db = SessionLocal()
    try:
        asset = Asset(
            symbol=symbol,
            name=f"{symbol} Optimization Asset",
            market="US",
            asset_type=asset_type,
            industry_id=industry_id,
            currency="USD",
            is_penny_stock=False,
            is_active=True,
        )
        db.add(asset)
        db.flush()
        db.add(
            AssetScore(
                asset_id=asset.id,
                trade_date=date(2099, 1, 1),
                market_score=80,
                industry_score=80,
                factor_score=80,
                price_level_score=80,
                fundamental_score=80,
                sentiment_score=None,
                industry_momentum_version=None,
                final_score=final_score,
                rating=rating,
                scoring_version="v2",
            )
        )
        db.commit()
        db.refresh(asset)
        return asset.id
    finally:
        db.close()


def seed_market_snapshot(snapshot_date: date):
    db = SessionLocal()
    try:
        db.add(
            MarketSnapshot(
                snapshot_date=snapshot_date,
                nasdaq_change_percent=1,
                sp500_change_percent=1,
                twii_change_percent=1,
                vix_value=18,
                us10y_value=4,
                market_score=100,
                market_regime="bull",
            )
        )
        db.commit()
    finally:
        db.close()


def test_portfolio_optimization_generation_constraints_and_latest():
    suffix = uuid4().hex[:10].upper()
    email = f"portfolio_opt_{suffix}@example.com"
    industry_codes = [f"POI{index}_{suffix}" for index in range(1, 5)]
    symbols = [f"PO{index}{suffix}" for index in range(1, 8)]
    market_date = date(2099, 2, 1)
    scores = [95, 90, 85, 92, 88, 86]

    for symbol in symbols:
        cleanup_asset(symbol)
    for code in industry_codes:
        cleanup_industry(code)
    cleanup_market_snapshot(market_date)
    cleanup_user(email)

    try:
        headers = create_headers(email)
        user_id = get_user_id(email)
        seed_goal_strategy(user_id)
        seed_market_snapshot(market_date)
        industry_ids = [seed_industry(code) for code in industry_codes]

        eligible_asset_ids = [
            seed_asset_score(symbols[0], "etf", industry_ids[0], 95, "strong_buy"),
            seed_asset_score(symbols[1], "etf", industry_ids[1], 90, "buy"),
            seed_asset_score(symbols[2], "etf", industry_ids[2], 85, "buy"),
            seed_asset_score(symbols[3], "stock", industry_ids[0], 92, "strong_buy"),
            seed_asset_score(symbols[4], "stock", industry_ids[1], 88, "buy"),
            seed_asset_score(symbols[5], "stock", industry_ids[3], 86, "buy"),
        ]
        excluded_asset_id = seed_asset_score(symbols[6], "stock", industry_ids[3], 99, "watch")

        response = client.post("/portfolio-optimizations/generate", headers=headers)
        optimization = response.json()

        assert response.status_code == 200
        assert optimization["market_state"] == "bull"
        assert optimization["strategy_type"] == "Balanced Growth"
        assert optimization["risk_level"] == "Balanced"
        assert optimization["expected_return"] == round((sum(scores) / len(scores)) / 5, 4)
        assert optimization["expected_risk"] == 20
        assert optimization["expected_sharpe"] == round(optimization["expected_return"] / 20, 4)

        assets_response = client.get(
            f"/portfolio-optimizations/{optimization['id']}/assets",
            headers=headers,
        )
        assets = assets_response.json()
        allocation_total = round(sum(item["allocation_percent"] for item in assets), 4)

        assert assets_response.status_code == 200
        assert allocation_total == 100
        assert all(item["allocation_percent"] <= 20 for item in assets)
        assert {item["asset_id"] for item in assets} == set(eligible_asset_ids)
        assert excluded_asset_id not in {item["asset_id"] for item in assets}

        db = SessionLocal()
        try:
            industry_totals = {}
            for item in assets:
                asset = db.query(Asset).filter(Asset.id == item["asset_id"]).first()
                industry_totals.setdefault(asset.industry_id, 0)
                industry_totals[asset.industry_id] += item["allocation_percent"]
            assert all(total <= 40 for total in industry_totals.values())
        finally:
            db.close()

        latest_response = client.get("/portfolio-optimizations/latest", headers=headers)
        assert latest_response.status_code == 200
        assert latest_response.json()["id"] == optimization["id"]

        detail_response = client.get(
            f"/portfolio-optimizations/{optimization['id']}",
            headers=headers,
        )
        assert detail_response.status_code == 200
        assert detail_response.json()["id"] == optimization["id"]
    finally:
        cleanup_user(email)
        for symbol in symbols:
            cleanup_asset(symbol)
        for code in industry_codes:
            cleanup_industry(code)
        cleanup_market_snapshot(market_date)
