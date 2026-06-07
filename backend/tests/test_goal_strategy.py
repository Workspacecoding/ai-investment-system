import sys
from datetime import date, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.asset import Asset, RecommendedAsset, UserWatchlist  # noqa: E402
from app.models.asset_score import AssetScore  # noqa: E402
from app.models.goal_strategy import GoalStrategy, GoalStrategyRecommendation  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.user_goal import UserGoal  # noqa: E402
from app.models.user_setting import UserSetting  # noqa: E402


client = TestClient(app)


def cleanup_user(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
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


def cleanup_asset(symbol: str, market: str = "US"):
    db = SessionLocal()
    try:
        asset = db.query(Asset).filter(Asset.symbol == symbol, Asset.market == market).first()
        if asset:
            db.query(GoalStrategyRecommendation).filter(
                GoalStrategyRecommendation.asset_id == asset.id
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


def create_headers(email: str):
    cleanup_user(email)
    password = "12345678"
    register_response = client.post(
        "/register",
        json={"email": email, "password": password, "name": "Goal Strategy User"},
    )
    assert register_response.status_code in (200, 201)
    login_response = client.post("/login", json={"email": email, "password": password})
    assert login_response.status_code == 200
    return {"Authorization": f"Bearer {login_response.json()['access_token']}"}


def seed_asset_score(symbol: str, asset_type: str, final_score: float, is_penny_stock=False):
    db = SessionLocal()
    try:
        asset = Asset(
            symbol=symbol,
            name=f"{symbol} Goal Strategy Asset",
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
        db.commit()
        db.refresh(asset)
        return asset.id
    finally:
        db.close()


def expected_required_annual_return(current_capital: float, target_capital: float, target_date: date):
    days = max((target_date - date.today()).days, 1)
    years = days / 365
    return round(((target_capital / current_capital) ** (1 / years) - 1) * 100, 4)


def test_goal_strategy_generation_and_recommendations():
    suffix = uuid4().hex[:10].upper()
    email = f"goal_strategy_{suffix}@example.com"
    symbols = [f"GETF{suffix}", f"GSTK{suffix}", f"GPEN{suffix}", f"GCRY{suffix}"]

    for symbol in symbols:
        cleanup_asset(symbol)
    cleanup_user(email)

    try:
        headers = create_headers(email)
        etf_id = seed_asset_score(symbols[0], "etf", 88)
        stock_id = seed_asset_score(symbols[1], "stock", 92)
        seed_asset_score(symbols[2], "stock", 99, is_penny_stock=True)
        seed_asset_score(symbols[3], "crypto", 95)

        settings_response = client.put(
            "/settings",
            headers=headers,
            json={
                "strategy_enabled": True,
                "allow_crypto": False,
                "allow_penny_stock": False,
                "risk_level": "balanced",
                "max_drawdown": 0.2,
            },
        )
        assert settings_response.status_code == 200

        target_date = date.today() + timedelta(days=365)
        goal_response = client.post(
            "/goals",
            headers=headers,
            json={
                "current_capital": 10000,
                "target_capital": 14000,
                "target_date": target_date.isoformat(),
            },
        )
        assert goal_response.status_code in (200, 201)

        strategy_response = client.post("/goal-strategies/generate", headers=headers)
        strategy = strategy_response.json()

        assert strategy_response.status_code == 200
        assert strategy["current_capital"] == 10000
        assert strategy["target_capital"] == 14000
        assert strategy["required_annual_return"] == expected_required_annual_return(
            10000,
            14000,
            target_date,
        )
        assert strategy["strategy_type"] == "High Risk Target"
        assert strategy["crypto_ratio"] == 0
        assert strategy["etf_ratio"] == 30
        assert strategy["stock_ratio"] == 60
        assert strategy["cash_ratio"] == 10
        assert strategy["probability_score"] == 30
        assert round(
            strategy["etf_ratio"]
            + strategy["stock_ratio"]
            + strategy["crypto_ratio"]
            + strategy["cash_ratio"],
            4,
        ) == 100

        recommendations_response = client.get(
            f"/goal-strategies/{strategy['id']}/recommendations",
            headers=headers,
        )
        recommendations = recommendations_response.json()

        assert recommendations_response.status_code == 200
        assert len(recommendations) >= 2
        assert any(item["recommendation_type"] == "core" for item in recommendations)
        assert any(item["recommendation_type"] == "growth" for item in recommendations)
        assert etf_id in {item["asset_id"] for item in recommendations}
        assert stock_id in {item["asset_id"] for item in recommendations}

        latest_response = client.get("/goal-strategies/latest", headers=headers)
        assert latest_response.status_code == 200
        assert latest_response.json()["id"] == strategy["id"]

        list_response = client.get("/goal-strategies", headers=headers)
        assert list_response.status_code == 200
        assert any(item["id"] == strategy["id"] for item in list_response.json())
    finally:
        cleanup_user(email)
        for symbol in symbols:
            cleanup_asset(symbol)
