import sys
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.asset import Asset, RecommendedAsset, UserWatchlist  # noqa: E402
from app.models.fundamental import FundamentalReport, FundamentalScore  # noqa: E402


client = TestClient(app)


def cleanup_asset(symbol: str, market: str = "US"):
    db = SessionLocal()
    try:
        asset = db.query(Asset).filter(Asset.symbol == symbol, Asset.market == market).first()
        if asset:
            db.query(FundamentalScore).filter(
                FundamentalScore.asset_id == asset.id
            ).delete(synchronize_session=False)
            db.query(FundamentalReport).filter(
                FundamentalReport.asset_id == asset.id
            ).delete(synchronize_session=False)
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


def seed_asset(symbol: str) -> int:
    db = SessionLocal()
    try:
        asset = Asset(
            symbol=symbol,
            name=f"{symbol} Fundamental Asset",
            market="US",
            asset_type="stock",
            industry_id=None,
            currency="USD",
            is_penny_stock=False,
            is_active=True,
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset.id
    finally:
        db.close()


def build_report_payload(report_year: int, report_quarter: int, **overrides):
    payload = {
        "report_year": report_year,
        "report_quarter": report_quarter,
        "revenue": 1000000,
        "revenue_yoy_percent": 25,
        "revenue_qoq_percent": 8,
        "gross_profit": 500000,
        "operating_income": 250000,
        "net_income": 200000,
        "eps": 3.5,
        "gross_margin": 50,
        "operating_margin": 25,
        "net_margin": 20,
        "roe": 22,
        "roa": 12,
        "debt_ratio": 35,
        "current_ratio": 1.8,
        "operating_cash_flow": 180000,
        "free_cash_flow": 120000,
    }
    payload.update(overrides)
    return payload


def test_fundamental_reports_and_scores():
    suffix = uuid4().hex[:10].upper()
    symbol = f"FUND{suffix}"
    cleanup_asset(symbol)

    try:
        asset_id = seed_asset(symbol)
        q1_payload = build_report_payload(2099, 1)
        create_response = client.post(
            f"/assets/{asset_id}/fundamentals",
            json=q1_payload,
        )
        report = create_response.json()

        assert create_response.status_code == 200
        assert report["asset_id"] == asset_id
        assert report["report_year"] == 2099
        assert report["report_quarter"] == 1

        update_response = client.post(
            f"/assets/{asset_id}/fundamentals",
            json=build_report_payload(2099, 1, revenue=1100000, revenue_yoy_percent=15),
        )
        updated_report = update_response.json()

        assert update_response.status_code == 200
        assert updated_report["id"] == report["id"]
        assert updated_report["revenue"] == 1100000

        q2_response = client.post(
            f"/assets/{asset_id}/fundamentals",
            json=build_report_payload(2099, 2, revenue_yoy_percent=5),
        )
        assert q2_response.status_code == 200

        reports_response = client.get(f"/assets/{asset_id}/fundamentals")
        reports = reports_response.json()

        assert reports_response.status_code == 200
        assert len(reports) == 2

        latest_report_response = client.get(f"/assets/{asset_id}/fundamentals/latest")
        latest_report = latest_report_response.json()

        assert latest_report_response.status_code == 200
        assert latest_report["report_quarter"] == 2

        score_response = client.post(f"/assets/{asset_id}/fundamentals/2099/1/score")
        score = score_response.json()
        expected_fundamental_score = (75 * 0.3) + (90 * 0.3) + (85 * 0.2) + (80 * 0.2)

        assert score_response.status_code == 200
        assert score["growth_score"] == 75
        assert score["profitability_score"] == 90
        assert score["financial_health_score"] == 85
        assert score["cashflow_score"] == 80
        assert score["fundamental_score"] == expected_fundamental_score
        assert score["fundamental_rating"] == "good"

        recalculated_response = client.post(f"/assets/{asset_id}/fundamentals/2099/1/score")
        recalculated_score = recalculated_response.json()

        assert recalculated_response.status_code == 200
        assert recalculated_score["id"] == score["id"]

        q2_score_response = client.post(f"/assets/{asset_id}/fundamentals/2099/2/score")
        assert q2_score_response.status_code == 200

        latest_score_response = client.get(f"/assets/{asset_id}/fundamentals/scores/latest")
        latest_score = latest_score_response.json()

        assert latest_score_response.status_code == 200
        assert latest_score["report_quarter"] == 2

        scores_response = client.get(f"/assets/{asset_id}/fundamentals/scores")
        scores = scores_response.json()

        assert scores_response.status_code == 200
        assert len(scores) == 2
    finally:
        cleanup_asset(symbol)
