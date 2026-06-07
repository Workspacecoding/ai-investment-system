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
from app.models.paper_trading import PaperPortfolio  # noqa: E402
from app.models.profit_allocation import (  # noqa: E402
    ProfitAllocation,
    ProfitAllocationRecommendation,
)
from app.models.trade_plan import TradePlan  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.user_goal import UserGoal  # noqa: E402
from app.models.user_setting import UserSetting  # noqa: E402


client = TestClient(app)


def cleanup_user(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            allocation_ids = [
                allocation.id
                for allocation in db.query(ProfitAllocation)
                .filter(ProfitAllocation.user_id == user.id)
                .all()
            ]
            if allocation_ids:
                db.query(ProfitAllocationRecommendation).filter(
                    ProfitAllocationRecommendation.allocation_id.in_(allocation_ids)
                ).delete(synchronize_session=False)
                db.query(ProfitAllocation).filter(
                    ProfitAllocation.id.in_(allocation_ids)
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

            db.query(PaperPortfolio).filter(PaperPortfolio.user_id == user.id).delete(
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


def cleanup_asset(symbol: str, market: str = "US"):
    db = SessionLocal()
    try:
        asset = db.query(Asset).filter(Asset.symbol == symbol, Asset.market == market).first()
        if asset:
            db.query(ProfitAllocationRecommendation).filter(
                ProfitAllocationRecommendation.asset_id == asset.id
            ).delete(synchronize_session=False)
            db.query(TradePlan).filter(TradePlan.asset_id == asset.id).delete(
                synchronize_session=False
            )
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


def create_headers(email: str):
    cleanup_user(email)
    password = "12345678"
    register_response = client.post(
        "/register",
        json={"email": email, "password": password, "name": "Profit User"},
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


def seed_portfolio(user_id: int) -> int:
    db = SessionLocal()
    try:
        portfolio = PaperPortfolio(
            user_id=user_id,
            name="Profit Portfolio",
            initial_cash=10000,
            cash_balance=10000,
            total_market_value=0,
            total_equity=10000,
            realized_pnl=0,
            unrealized_pnl=0,
        )
        db.add(portfolio)
        db.commit()
        db.refresh(portfolio)
        return portfolio.id
    finally:
        db.close()


def seed_goal_strategy(user_id: int, strategy_type: str):
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
            strategy_type=strategy_type,
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


def seed_asset(symbol: str, asset_type: str, final_score: float, is_penny_stock=False) -> int:
    db = SessionLocal()
    try:
        asset = Asset(
            symbol=symbol,
            name=f"{symbol} Profit Asset",
            market="US",
            asset_type=asset_type,
            industry_id=None,
            currency="USD",
            is_penny_stock=is_penny_stock,
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
                rating="strong_buy",
                scoring_version="v2",
            )
        )
        db.add(
            TradePlan(
                asset_id=asset.id,
                trade_date=date(2099, 1, 1),
                final_score=final_score,
                rating="strong_buy",
                action="buy",
                current_price=100,
                entry_price=100,
                stop_loss_price=92,
                take_profit_1=108,
                take_profit_2=115,
                expected_return_percent=8,
                max_loss_percent=8,
                risk_reward_ratio=1,
                strategy_type="pullback_buy",
                reason="Profit allocation seed",
            )
        )
        db.commit()
        db.refresh(asset)
        return asset.id
    finally:
        db.close()


def update_setting(user_id: int, allow_crypto=False, allow_penny_stock=False):
    db = SessionLocal()
    try:
        setting = db.query(UserSetting).filter(UserSetting.user_id == user_id).first()
        if not setting:
            setting = UserSetting(user_id=user_id)
            db.add(setting)
        setting.strategy_enabled = True
        setting.allow_crypto = allow_crypto
        setting.allow_penny_stock = allow_penny_stock
        setting.risk_level = "balanced"
        setting.max_drawdown = 0.2
        db.commit()
    finally:
        db.close()


def assert_allocation_amounts(allocation: dict, expected_version: str, expected_ratios: dict):
    assert allocation["allocation_version"] == expected_version
    ratio_total = (
        allocation["entertainment_ratio"]
        + allocation["core_asset_ratio"]
        + allocation["reinvest_ratio"]
        + allocation["cash_ratio"]
    )
    assert round(ratio_total, 4) == 100
    for key, ratio in expected_ratios.items():
        assert allocation[f"{key}_ratio"] == ratio
        assert allocation[f"{key}_amount"] == 1000 * ratio / 100


def test_profit_allocation_generation_versions_recommendations_and_latest():
    suffix = uuid4().hex[:10].upper()
    email = f"profit_{suffix}@example.com"
    symbols = [
        f"PETF{suffix}",
        f"PET2{suffix}",
        f"PSTK{suffix}",
        f"PPEN{suffix}",
        f"PCRY{suffix}",
    ]

    for symbol in symbols:
        cleanup_asset(symbol)
    cleanup_user(email)

    try:
        headers = create_headers(email)
        user_id = get_user_id(email)
        portfolio_id = seed_portfolio(user_id)
        update_setting(user_id, allow_crypto=False, allow_penny_stock=False)

        etf_id = seed_asset(symbols[0], "etf", 95)
        seed_asset(symbols[1], "etf", 90)
        stock_id = seed_asset(symbols[2], "stock", 92)
        penny_id = seed_asset(symbols[3], "stock", 99, is_penny_stock=True)
        crypto_id = seed_asset(symbols[4], "crypto", 98)

        seed_goal_strategy(user_id, "Conservative ETF")
        conservative_response = client.post(
            "/profit-allocations/generate",
            headers=headers,
            json={"portfolio_id": portfolio_id, "realized_profit": 1000},
        )
        conservative = conservative_response.json()
        assert conservative_response.status_code == 200
        assert_allocation_amounts(
            conservative,
            "Conservative",
            {
                "entertainment": 10,
                "core_asset": 50,
                "reinvest": 20,
                "cash": 20,
            },
        )

        seed_goal_strategy(user_id, "Balanced Growth")
        balanced_response = client.post(
            "/profit-allocations/generate",
            headers=headers,
            json={"portfolio_id": portfolio_id, "realized_profit": 1000},
        )
        balanced = balanced_response.json()
        assert balanced_response.status_code == 200
        assert_allocation_amounts(
            balanced,
            "Balanced",
            {
                "entertainment": 15,
                "core_asset": 35,
                "reinvest": 35,
                "cash": 15,
            },
        )

        seed_goal_strategy(user_id, "High Risk Target")
        aggressive_response = client.post(
            "/profit-allocations/generate",
            headers=headers,
            json={"portfolio_id": portfolio_id, "realized_profit": 1000},
        )
        aggressive = aggressive_response.json()
        assert aggressive_response.status_code == 200
        assert_allocation_amounts(
            aggressive,
            "Aggressive",
            {
                "entertainment": 10,
                "core_asset": 20,
                "reinvest": 60,
                "cash": 10,
            },
        )

        recommendations_response = client.get(
            f"/profit-allocations/{aggressive['id']}/recommendations",
            headers=headers,
        )
        recommendations = recommendations_response.json()
        recommended_ids = {item["asset_id"] for item in recommendations}

        assert recommendations_response.status_code == 200
        assert any(item["recommendation_type"] == "core" for item in recommendations)
        assert any(item["recommendation_type"] == "growth" for item in recommendations)
        assert etf_id in recommended_ids
        assert stock_id in recommended_ids
        assert crypto_id not in recommended_ids
        assert penny_id not in recommended_ids

        latest_response = client.get("/profit-allocations/latest", headers=headers)
        assert latest_response.status_code == 200
        assert latest_response.json()["id"] == aggressive["id"]

        list_response = client.get("/profit-allocations", headers=headers)
        assert list_response.status_code == 200
        assert len([item for item in list_response.json() if item["portfolio_id"] == portfolio_id]) >= 3
    finally:
        cleanup_user(email)
        for symbol in symbols:
            cleanup_asset(symbol)
