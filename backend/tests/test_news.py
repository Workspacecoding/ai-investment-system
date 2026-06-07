import sys
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.asset import Asset, RecommendedAsset, UserWatchlist  # noqa: E402
from app.models.industry import Industry, IndustryMomentum  # noqa: E402
from app.models.news import IndustrySentimentSnapshot, NewsArticle  # noqa: E402


client = TestClient(app)


def cleanup_asset(symbol: str, market: str = "US"):
    db = SessionLocal()
    try:
        asset = db.query(Asset).filter(Asset.symbol == symbol, Asset.market == market).first()
        if asset:
            db.query(NewsArticle).filter(NewsArticle.asset_id == asset.id).delete(
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


def cleanup_industry(industry_code: str):
    db = SessionLocal()
    try:
        industry = db.query(Industry).filter(Industry.industry_code == industry_code).first()
        if industry:
            db.query(IndustrySentimentSnapshot).filter(
                IndustrySentimentSnapshot.industry_id == industry.id
            ).delete(synchronize_session=False)
            db.query(NewsArticle).filter(NewsArticle.industry_id == industry.id).delete(
                synchronize_session=False
            )
            db.query(IndustryMomentum).filter(
                IndustryMomentum.industry_id == industry.id
            ).delete(synchronize_session=False)
            db.delete(industry)
            db.commit()
    finally:
        db.close()


def seed_industry(industry_code: str) -> int:
    db = SessionLocal()
    try:
        industry = Industry(
            industry_code=industry_code,
            industry_name=f"{industry_code} Industry",
            market="US",
            description="News test industry",
        )
        db.add(industry)
        db.commit()
        db.refresh(industry)
        return industry.id
    finally:
        db.close()


def seed_asset(symbol: str, industry_id: int) -> int:
    db = SessionLocal()
    try:
        asset = Asset(
            symbol=symbol,
            name=f"{symbol} News Asset",
            market="US",
            asset_type="stock",
            industry_id=industry_id,
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


def news_payload(
    title: str,
    industry_id: int,
    asset_id: int | None,
    published_at: datetime,
    sentiment_label: str = "positive",
    impact_score: float = 80,
    **overrides,
):
    payload = {
        "title": title,
        "source": "Test Source",
        "url": None,
        "published_at": published_at.isoformat(),
        "summary": "Manual news test",
        "raw_content": None,
        "asset_id": asset_id,
        "industry_id": industry_id,
        "market": "US",
        "topic_tags": "AI, Semiconductor",
        "sentiment_label": sentiment_label,
        "impact_score": impact_score,
    }
    payload.update(overrides)
    return payload


def test_news_sentiment_flow_and_ranking():
    suffix = uuid4().hex[:10].upper()
    industry_code = f"NEWS_{suffix}"
    second_industry_code = f"NEWS2_{suffix}"
    symbol = f"NWS{suffix}"
    snapshot_date = datetime.utcnow().date()

    cleanup_asset(symbol)
    cleanup_industry(industry_code)
    cleanup_industry(second_industry_code)

    try:
        industry_id = seed_industry(industry_code)
        second_industry_id = seed_industry(second_industry_code)
        asset_id = seed_asset(symbol, industry_id)

        article_response = client.post(
            "/news",
            json=news_payload(
                "Positive article",
                industry_id,
                asset_id,
                datetime.utcnow(),
                sentiment_label="positive",
                impact_score=80,
            ),
        )
        article = article_response.json()

        assert article_response.status_code == 200
        assert article["asset_id"] == asset_id
        assert article["industry_id"] == industry_id
        assert article["sentiment_score"] == 0.7
        assert article["freshness_score"] == 100
        assert article["weighted_news_score"] == 56

        older_response = client.post(
            "/news",
            json=news_payload(
                "Older negative article",
                industry_id,
                None,
                datetime.utcnow() - timedelta(days=5),
                sentiment_label="negative",
                impact_score=60,
            ),
        )
        older_article = older_response.json()

        assert older_response.status_code == 200
        assert older_article["sentiment_score"] == -0.7
        assert older_article["freshness_score"] == 50
        assert older_article["weighted_news_score"] == -21

        neutral_response = client.post(
            "/news",
            json=news_payload(
                "Neutral article",
                industry_id,
                None,
                datetime.utcnow() - timedelta(days=2),
                sentiment_label="neutral",
                impact_score=50,
            ),
        )
        assert neutral_response.status_code == 200

        asset_filter_response = client.get(f"/news?asset_id={asset_id}")
        industry_filter_response = client.get(f"/news?industry_id={industry_id}")
        sentiment_filter_response = client.get("/news?sentiment_label=negative")

        assert asset_filter_response.status_code == 200
        assert len(asset_filter_response.json()) == 1
        assert industry_filter_response.status_code == 200
        assert len(
            [item for item in industry_filter_response.json() if item["industry_id"] == industry_id]
        ) == 3
        assert sentiment_filter_response.status_code == 200
        assert any(item["id"] == older_article["id"] for item in sentiment_filter_response.json())

        snapshot_response = client.post(
            f"/industries/{industry_id}/sentiment/calculate"
            f"?snapshot_date={snapshot_date.isoformat()}"
        )
        snapshot = snapshot_response.json()
        expected_avg_sentiment = round((0.7 + -0.7 + 0) / 3, 4)
        expected_avg_impact = round((80 + 60 + 50) / 3, 4)
        expected_industry_news_score = expected_avg_sentiment * 50 + 50 * 0.5

        assert snapshot_response.status_code == 200
        assert snapshot["news_count"] == 3
        assert snapshot["avg_sentiment_score"] == expected_avg_sentiment
        assert snapshot["avg_impact_score"] == expected_avg_impact
        assert snapshot["news_heat_score"] == 50
        assert snapshot["industry_news_score"] == expected_industry_news_score

        latest_response = client.get(f"/industries/{industry_id}/sentiment/latest")
        assert latest_response.status_code == 200
        assert latest_response.json()["id"] == snapshot["id"]

        client.post(
            "/news",
            json=news_payload(
                "Second industry good news",
                second_industry_id,
                None,
                datetime.utcnow(),
                sentiment_label="positive",
                impact_score=100,
            ),
        )
        second_snapshot_response = client.post(
            f"/industries/{second_industry_id}/sentiment/calculate"
            f"?snapshot_date={snapshot_date.isoformat()}"
        )
        assert second_snapshot_response.status_code == 200

        ranking_response = client.get("/industries/sentiment/ranking")
        ranking = [
            item
            for item in ranking_response.json()
            if item["industry_id"] in {industry_id, second_industry_id}
        ]

        assert ranking_response.status_code == 200
        assert len(ranking) == 2
        assert ranking[0]["industry_news_score"] >= ranking[1]["industry_news_score"]
        assert ranking[0]["industry_id"] == second_industry_id
    finally:
        cleanup_asset(symbol)
        cleanup_industry(industry_code)
        cleanup_industry(second_industry_code)
