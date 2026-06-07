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
from app.models.fundamental import FundamentalScore  # noqa: E402
from app.models.industry import Industry, IndustryMomentum  # noqa: E402
from app.models.market import MarketSnapshot  # noqa: E402
from app.models.price import AssetPrice  # noqa: E402
from app.models.price_level import PriceLevel  # noqa: E402


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
            db.query(AssetScore).filter(AssetScore.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(FundamentalScore).filter(
                FundamentalScore.asset_id == asset.id
            ).delete(synchronize_session=False)
            db.query(PriceLevel).filter(PriceLevel.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(FactorScore).filter(FactorScore.asset_id == asset.id).delete(
                synchronize_session=False
            )
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


def cleanup_industry(industry_code: str):
    db = SessionLocal()
    try:
        industry = (
            db.query(Industry)
            .filter(Industry.industry_code == industry_code)
            .first()
        )
        if industry:
            db.query(IndustryMomentum).filter(
                IndustryMomentum.industry_id == industry.id
            ).delete(synchronize_session=False)
            db.delete(industry)
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


def seed_score_dependencies(
    symbol: str,
    industry_code: str,
    trade_date: date,
    level_52w: str,
    factor_scores: list[float],
    momentum_score: float = 92,
    momentum_version: str = "v1",
    sentiment_score: float | None = None,
):
    db = SessionLocal()
    try:
        industry = Industry(
            industry_code=industry_code,
            industry_name=f"{industry_code} Industry",
            market="US",
            description="Scoring test industry",
        )
        db.add(industry)
        db.flush()

        asset = Asset(
            symbol=symbol,
            name=f"{symbol} Scoring Asset",
            market="US",
            asset_type="stock",
            industry_id=industry.id,
            currency="USD",
            is_penny_stock=False,
            is_active=True,
        )
        db.add(asset)
        db.flush()

        db.add(
            IndustryMomentum(
                industry_id=industry.id,
                snapshot_date=trade_date,
                avg_return_1m=10,
                avg_return_3m=10,
                avg_return_6m=10,
                volume_score=90,
                trend_score=90,
                sentiment_score=sentiment_score,
                momentum_score=momentum_score,
                momentum_version=momentum_version,
                ranking=1,
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
        for index, score in enumerate(factor_scores):
            db.add(
                FactorScore(
                    asset_id=asset.id,
                    trade_date=trade_date,
                    factor_name=f"test_factor_{index}",
                    factor_type="technical",
                    factor_value=score,
                    factor_score=score,
                )
            )
        db.commit()
        return asset.id
    finally:
        db.close()


def seed_market_snapshot(trade_date: date):
    db = SessionLocal()
    try:
        db.add(
            MarketSnapshot(
                snapshot_date=trade_date,
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


def seed_fundamental_score(asset_id: int, score_value: float):
    db = SessionLocal()
    try:
        db.add(
            FundamentalScore(
                asset_id=asset_id,
                report_year=2099,
                report_quarter=4,
                growth_score=score_value,
                profitability_score=score_value,
                financial_health_score=score_value,
                cashflow_score=score_value,
                fundamental_score=score_value,
                fundamental_rating="excellent",
            )
        )
        db.commit()
    finally:
        db.close()


def test_scoring_calculate_latest_ranking_and_upsert():
    suffix = uuid4().hex[:10].upper()
    strong_symbol = f"S{suffix}"
    weak_symbol = f"W{suffix}"
    sentiment_symbol = f"V{suffix}"
    strong_industry_code = f"SCORING_STRONG_{suffix}"
    weak_industry_code = f"SCORING_WEAK_{suffix}"
    sentiment_industry_code = f"SCORING_SENTIMENT_{suffix}"
    trade_date = date(2099, 7, 1)

    for symbol in (strong_symbol, weak_symbol, sentiment_symbol):
        cleanup_asset(symbol, "US")
    for industry_code in (
        strong_industry_code,
        weak_industry_code,
        sentiment_industry_code,
    ):
        cleanup_industry(industry_code)
    cleanup_market_snapshot(trade_date)

    try:
        seed_market_snapshot(trade_date)
        strong_asset_id = seed_score_dependencies(
            strong_symbol,
            strong_industry_code,
            trade_date,
            level_52w="very_low",
            factor_scores=[80, 80, 80, 80],
        )
        weak_asset_id = seed_score_dependencies(
            weak_symbol,
            weak_industry_code,
            trade_date,
            level_52w="very_high",
            factor_scores=[40, 40, 40, 40],
            momentum_score=92,
            momentum_version="v1",
        )
        sentiment_asset_id = seed_score_dependencies(
            sentiment_symbol,
            sentiment_industry_code,
            trade_date,
            level_52w="low",
            factor_scores=[80, 80, 80, 80],
            momentum_score=88,
            momentum_version="v2",
            sentiment_score=90,
        )
        seed_fundamental_score(weak_asset_id, 95)
        seed_fundamental_score(sentiment_asset_id, 90)

        response = client.post(f"/assets/{strong_asset_id}/score/calculate")
        score = response.json()
        expected_v1_final_score = (90 * 0.2) + (92 * 0.25) + (80 * 0.35) + (90 * 0.2)

        assert response.status_code == 200
        assert score["asset_id"] == strong_asset_id
        assert score["market_score"] == 90
        assert score["industry_score"] == 92
        assert score["factor_score"] == 80
        assert score["price_level_score"] == 90
        assert score["fundamental_score"] is None
        assert score["sentiment_score"] is None
        assert score["industry_momentum_version"] == "v1"
        assert score["scoring_version"] == "v1"
        assert score["final_score"] == expected_v1_final_score
        assert score["rating"] == "strong_buy"

        latest_response = client.get(f"/assets/{strong_asset_id}/score/latest")
        latest_score = latest_response.json()

        assert latest_response.status_code == 200
        assert latest_score["id"] == score["id"]

        recalculated_response = client.post(f"/assets/{strong_asset_id}/score/calculate")
        recalculated_score = recalculated_response.json()

        assert recalculated_response.status_code == 200
        assert recalculated_score["id"] == score["id"]

        weak_response = client.post(f"/assets/{weak_asset_id}/score/calculate")
        weak_score = weak_response.json()
        expected_v2_final_score = (
            (90 * 0.15)
            + (92 * 0.2)
            + (40 * 0.3)
            + (20 * 0.15)
            + (95 * 0.2)
        )

        assert weak_response.status_code == 200
        assert weak_score["fundamental_score"] == 95
        assert weak_score["sentiment_score"] is None
        assert weak_score["industry_momentum_version"] == "v1"
        assert weak_score["scoring_version"] == "v2"
        assert weak_score["final_score"] == expected_v2_final_score
        assert weak_score["rating"] == "buy"
        assert weak_score["final_score"] < score["final_score"]

        sentiment_response = client.post(f"/assets/{sentiment_asset_id}/score/calculate")
        sentiment_score = sentiment_response.json()
        expected_v3_final_score = (
            (90 * 0.15)
            + (88 * 0.2)
            + (80 * 0.3)
            + (75 * 0.15)
            + (90 * 0.2)
        )

        assert sentiment_response.status_code == 200
        assert sentiment_score["fundamental_score"] == 90
        assert sentiment_score["sentiment_score"] == 90
        assert sentiment_score["industry_momentum_version"] == "v2"
        assert sentiment_score["scoring_version"] == "v3"
        assert sentiment_score["final_score"] == expected_v3_final_score
        assert sentiment_score["rating"] == "strong_buy"

        ranking_response = client.get("/assets/scores/ranking")
        ranking = ranking_response.json()
        relevant_scores = [
            item
            for item in ranking
            if item["asset_id"] in {strong_asset_id, weak_asset_id, sentiment_asset_id}
        ]

        assert ranking_response.status_code == 200
        assert len(relevant_scores) == 3
        assert relevant_scores[0]["asset_id"] == strong_asset_id
        assert relevant_scores[0]["final_score"] >= relevant_scores[1]["final_score"]
        assert relevant_scores[1]["final_score"] >= relevant_scores[2]["final_score"]
    finally:
        for symbol in (strong_symbol, weak_symbol, sentiment_symbol):
            cleanup_asset(symbol, "US")
        for industry_code in (
            strong_industry_code,
            weak_industry_code,
            sentiment_industry_code,
        ):
            cleanup_industry(industry_code)
        cleanup_market_snapshot(trade_date)
