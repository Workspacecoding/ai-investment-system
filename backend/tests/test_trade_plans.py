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
from app.models.factor import FactorScore  # noqa: E402
from app.models.indicator import TechnicalIndicator  # noqa: E402
from app.models.price import AssetPrice  # noqa: E402
from app.models.price_level import PriceLevel  # noqa: E402
from app.models.trade_plan import TradePlan  # noqa: E402


client = TestClient(app)


def cleanup_asset(symbol: str, market: str):
    db = SessionLocal()
    try:
        asset = (
            db.query(Asset)
            .filter(Asset.symbol == symbol, Asset.market == market)
            .first()
        )
        if asset:
            db.query(TradePlan).filter(TradePlan.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(AssetScore).filter(AssetScore.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(PriceLevel).filter(PriceLevel.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(FactorScore).filter(FactorScore.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(TechnicalIndicator).filter(
                TechnicalIndicator.asset_id == asset.id
            ).delete(synchronize_session=False)
            db.query(AssetPrice).filter(AssetPrice.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(UserWatchlist).filter(UserWatchlist.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(RecommendedAsset).filter(
                RecommendedAsset.asset_id == asset.id
            ).delete(synchronize_session=False)
            db.delete(asset)
            db.commit()
    finally:
        db.close()


def seed_trade_plan_dependencies(
    symbol: str,
    trade_date: date,
    rating: str,
    final_score: float,
    level_52w: str,
    is_uptrend: bool,
):
    db = SessionLocal()
    try:
        asset = Asset(
            symbol=symbol,
            name=f"{symbol} Trade Plan Asset",
            market="US",
            asset_type="stock",
            industry_id=None,
            currency="USD",
            is_penny_stock=False,
            is_active=True,
        )
        db.add(asset)
        db.flush()
        db.add(
            AssetScore(
                asset_id=asset.id,
                trade_date=trade_date,
                market_score=90,
                industry_score=80,
                factor_score=75,
                price_level_score=60,
                final_score=final_score,
                rating=rating,
            )
        )
        db.add(
            AssetPrice(
                asset_id=asset.id,
                trade_date=trade_date,
                open_price=99,
                high_price=105,
                low_price=95,
                close_price=100,
                volume=1000,
            )
        )
        db.add(
            TechnicalIndicator(
                asset_id=asset.id,
                trade_date=trade_date,
                ma5=103,
                ma10=102,
                ma20=95,
                ma60=None,
                rsi14=55,
                volume_ma5=1000,
                volume_ratio=1,
                change_percent=1,
                is_uptrend=is_uptrend,
                is_overbought=False,
                is_volume_spike=False,
            )
        )
        db.add(
            PriceLevel(
                asset_id=asset.id,
                trade_date=trade_date,
                current_price=100,
                high_52w=120,
                low_52w=80,
                percentile_52w=0.5,
                high_all_time=120,
                low_all_time=80,
                percentile_all_time=0.5,
                level_52w=level_52w,
                level_all_time=level_52w,
            )
        )
        db.commit()
        return asset.id
    finally:
        db.close()


def test_trade_plan_generation_latest_upsert_and_ranking():
    suffix = uuid4().hex[:10].upper()
    buy_symbol = f"TB{suffix}"
    watch_symbol = f"TW{suffix}"
    avoid_symbol = f"TA{suffix}"
    trade_date = date(2099, 6, 1)

    for symbol in (buy_symbol, watch_symbol, avoid_symbol):
        cleanup_asset(symbol, "US")

    try:
        buy_asset_id = seed_trade_plan_dependencies(
            buy_symbol,
            trade_date,
            rating="strong_buy",
            final_score=85,
            level_52w="normal",
            is_uptrend=True,
        )
        watch_asset_id = seed_trade_plan_dependencies(
            watch_symbol,
            trade_date,
            rating="buy",
            final_score=75,
            level_52w="high",
            is_uptrend=True,
        )
        avoid_asset_id = seed_trade_plan_dependencies(
            avoid_symbol,
            trade_date,
            rating="avoid",
            final_score=30,
            level_52w="very_high",
            is_uptrend=False,
        )

        buy_response = client.post(f"/assets/{buy_asset_id}/trade-plan/generate")
        buy_plan = buy_response.json()

        assert buy_response.status_code == 200
        assert buy_plan["action"] == "buy"
        assert buy_plan["entry_price"] == 100.0
        assert buy_plan["stop_loss_price"] == 90.25
        assert buy_plan["take_profit_1"] == 108.0
        assert buy_plan["take_profit_2"] == 115.0
        assert buy_plan["expected_return_percent"] == 8.0
        assert buy_plan["max_loss_percent"] == 9.75
        assert buy_plan["risk_reward_ratio"] == round(8.0 / 9.75, 4)
        assert buy_plan["strategy_type"] == "pullback_buy"

        recalculated_response = client.post(f"/assets/{buy_asset_id}/trade-plan/generate")
        recalculated_plan = recalculated_response.json()
        assert recalculated_response.status_code == 200
        assert recalculated_plan["id"] == buy_plan["id"]

        latest_response = client.get(f"/assets/{buy_asset_id}/trade-plan/latest")
        latest_plan = latest_response.json()
        assert latest_response.status_code == 200
        assert latest_plan["id"] == buy_plan["id"]

        watch_response = client.post(f"/assets/{watch_asset_id}/trade-plan/generate")
        watch_plan = watch_response.json()
        assert watch_response.status_code == 200
        assert watch_plan["action"] == "watch"
        assert watch_plan["entry_price"] == 95.0

        avoid_response = client.post(f"/assets/{avoid_asset_id}/trade-plan/generate")
        avoid_plan = avoid_response.json()
        assert avoid_response.status_code == 200
        assert avoid_plan["action"] == "avoid"
        assert avoid_plan["entry_price"] is None
        assert avoid_plan["strategy_type"] == "avoid"

        ranking_response = client.get("/trade-plans/ranking")
        ranking = ranking_response.json()
        relevant_plans = [
            plan
            for plan in ranking
            if plan["asset_id"] in {buy_asset_id, watch_asset_id, avoid_asset_id}
        ]

        assert ranking_response.status_code == 200
        assert len(relevant_plans) == 3
        assert relevant_plans[0]["asset_id"] == buy_asset_id
        assert relevant_plans[0]["action"] == "buy"
        assert relevant_plans[1]["final_score"] >= relevant_plans[2]["final_score"]

        plans_response = client.get("/trade-plans")
        assert plans_response.status_code == 200
        assert any(plan["id"] == buy_plan["id"] for plan in plans_response.json())
    finally:
        for symbol in (buy_symbol, watch_symbol, avoid_symbol):
            cleanup_asset(symbol, "US")
