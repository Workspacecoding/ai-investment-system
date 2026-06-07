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
from app.models.indicator import TechnicalIndicator  # noqa: E402
from app.models.industry import Industry, IndustryMomentum  # noqa: E402
from app.models.price import AssetPrice  # noqa: E402
from app.models.price_level import PriceLevel  # noqa: E402
from app.models.swing_trade import SwingTradeSetup  # noqa: E402
from app.models.trade_plan import TradePlan  # noqa: E402


client = TestClient(app)


def cleanup_asset(symbol: str, market: str = "US"):
    db = SessionLocal()
    try:
        asset = db.query(Asset).filter(Asset.symbol == symbol, Asset.market == market).first()
        if asset:
            db.query(SwingTradeSetup).filter(SwingTradeSetup.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(TradePlan).filter(TradePlan.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(PriceLevel).filter(PriceLevel.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(TechnicalIndicator).filter(
                TechnicalIndicator.asset_id == asset.id
            ).delete(synchronize_session=False)
            db.query(AssetScore).filter(AssetScore.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(AssetPrice).filter(AssetPrice.asset_id == asset.id).delete(
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


def seed_industry(code: str, trend_score: float) -> int:
    db = SessionLocal()
    try:
        industry = Industry(
            industry_code=code,
            industry_name=f"{code} Industry",
            market="US",
            description="Swing test industry",
        )
        db.add(industry)
        db.flush()
        db.add(
            IndustryMomentum(
                industry_id=industry.id,
                snapshot_date=date(2099, 1, 1),
                avg_return_1m=10,
                avg_return_3m=10,
                avg_return_6m=10,
                volume_score=80,
                trend_score=trend_score,
                sentiment_score=80,
                momentum_score=85,
                momentum_version="v2",
                ranking=1,
            )
        )
        db.commit()
        db.refresh(industry)
        return industry.id
    finally:
        db.close()


def seed_swing_dependencies(
    symbol: str,
    industry_id: int,
    trade_date: date,
    rating: str,
    level_52w: str,
    current_price: float,
    high_52w: float,
    is_uptrend: bool,
    final_score: float = 90,
    industry_score: float = 80,
    factor_score: float = 85,
    ma20: float = 95,
    ma60: float | None = 80,
) -> int:
    db = SessionLocal()
    try:
        asset = Asset(
            symbol=symbol,
            name=f"{symbol} Swing Asset",
            market="US",
            asset_type="stock",
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
                trade_date=trade_date,
                market_score=80,
                industry_score=industry_score,
                factor_score=factor_score,
                price_level_score=75,
                fundamental_score=80,
                sentiment_score=80,
                industry_momentum_version="v2",
                final_score=final_score,
                rating=rating,
                scoring_version="v3",
            )
        )
        db.add(
            TechnicalIndicator(
                asset_id=asset.id,
                trade_date=trade_date,
                ma5=100,
                ma10=98,
                ma20=ma20,
                ma60=ma60,
                rsi14=55,
                volume_ma5=1000,
                volume_ratio=1.2,
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
                current_price=current_price,
                high_52w=high_52w,
                low_52w=60,
                percentile_52w=0.5,
                high_all_time=max(high_52w, current_price),
                low_all_time=50,
                percentile_all_time=0.5,
                level_52w=level_52w,
                level_all_time=level_52w,
            )
        )
        db.add(
            TradePlan(
                asset_id=asset.id,
                trade_date=trade_date,
                final_score=final_score,
                rating=rating,
                action="buy",
                current_price=current_price,
                entry_price=current_price,
                stop_loss_price=current_price * 0.9,
                take_profit_1=current_price * 1.08,
                take_profit_2=current_price * 1.15,
                expected_return_percent=8,
                max_loss_percent=10,
                risk_reward_ratio=0.8,
                strategy_type="pullback_buy",
                reason="Swing seed",
            )
        )
        db.commit()
        db.refresh(asset)
        return asset.id
    finally:
        db.close()


def test_swing_setup_types_prices_confidence_and_ranking():
    suffix = uuid4().hex[:10].upper()
    trade_date = date(2099, 3, 1)
    industry_code = f"SWING_{suffix}"
    symbols = [f"SWP{suffix}", f"SWT{suffix}", f"SWB{suffix}"]

    for symbol in symbols:
        cleanup_asset(symbol)
    cleanup_industry(industry_code)

    try:
        industry_id = seed_industry(industry_code, trend_score=90)
        pullback_id = seed_swing_dependencies(
            symbols[0],
            industry_id,
            trade_date,
            rating="strong_buy",
            level_52w="normal",
            current_price=100,
            high_52w=120,
            is_uptrend=True,
        )
        trend_id = seed_swing_dependencies(
            symbols[1],
            industry_id,
            trade_date,
            rating="strong_buy",
            level_52w="high",
            current_price=100,
            high_52w=120,
            is_uptrend=True,
            final_score=82,
            factor_score=75,
        )
        breakout_id = seed_swing_dependencies(
            symbols[2],
            industry_id,
            trade_date,
            rating="buy",
            level_52w="high",
            current_price=121,
            high_52w=120,
            is_uptrend=True,
            final_score=78,
            factor_score=70,
            ma60=None,
        )

        pullback_response = client.post(f"/assets/{pullback_id}/swing-setup/generate")
        pullback = pullback_response.json()

        assert pullback_response.status_code == 200
        assert pullback["setup_type"] == "pullback"
        assert pullback["entry_zone_low"] == 95
        assert pullback["entry_zone_high"] == 96.9
        assert pullback["add_zone_1"] == 90.25
        assert pullback["add_zone_2"] == 85.5
        assert pullback["stop_loss_price"] == 77.6
        assert pullback["target_price_1"] == 112
        assert pullback["target_price_2"] == 125
        assert pullback["expected_holding_days"] == 45
        assert pullback["swing_score"] == 87
        assert pullback["confidence_level"] == "high"

        trend_response = client.post(f"/assets/{trend_id}/swing-setup/generate")
        trend = trend_response.json()

        assert trend_response.status_code == 200
        assert trend["setup_type"] == "trend_follow"
        assert trend["entry_zone_low"] == 100
        assert trend["entry_zone_high"] == 101
        assert trend["expected_holding_days"] == 90
        assert trend["confidence_level"] == "medium"

        breakout_response = client.post(f"/assets/{breakout_id}/swing-setup/generate")
        breakout = breakout_response.json()

        assert breakout_response.status_code == 200
        assert breakout["setup_type"] == "breakout"
        assert breakout["entry_zone_low"] == 120
        assert breakout["entry_zone_high"] == 122.4
        assert breakout["stop_loss_price"] == 108.9
        assert breakout["target_price_1"] == 135.52
        assert breakout["target_price_2"] == 151.25
        assert breakout["expected_holding_days"] == 60

        latest_response = client.get(f"/assets/{pullback_id}/swing-setup/latest")
        assert latest_response.status_code == 200
        assert latest_response.json()["id"] == pullback["id"]

        ranking_response = client.get("/swing-setups/ranking")
        ranking = [
            item
            for item in ranking_response.json()
            if item["asset_id"] in {pullback_id, trend_id, breakout_id}
        ]

        assert ranking_response.status_code == 200
        assert len(ranking) == 3
        assert ranking[0]["swing_score"] >= ranking[1]["swing_score"]
        assert ranking[1]["swing_score"] >= ranking[2]["swing_score"]
        assert ranking[0]["asset_id"] == pullback_id
    finally:
        for symbol in symbols:
            cleanup_asset(symbol)
        cleanup_industry(industry_code)
