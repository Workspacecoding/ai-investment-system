import sys
from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.industry import Industry, IndustryMomentum  # noqa: E402


client = TestClient(app)


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


def cleanup_momentum_date(snapshot_date: date):
    db = SessionLocal()
    try:
        db.query(IndustryMomentum).filter(
            IndustryMomentum.snapshot_date == snapshot_date
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def create_industry(industry_code: str):
    response = client.post(
        "/industries",
        json={
            "industry_code": industry_code,
            "industry_name": f"{industry_code} Industry",
            "market": "US",
            "description": "Test industry",
        },
    )
    assert response.status_code in (200, 201)
    return response.json()


def post_momentum(industry_id: int, snapshot_date: date, **overrides):
    payload = {
        "snapshot_date": snapshot_date.isoformat(),
        "avg_return_1m": 10,
        "avg_return_3m": 8,
        "avg_return_6m": 6,
        "volume_score": 80,
        "trend_score": 70,
        "sentiment_score": 50,
    }
    payload.update(overrides)
    return client.post(f"/industries/{industry_id}/momentum", json=payload)


def test_industry_momentum_flow_and_ranking():
    suffix = uuid4().hex
    industry_code = f"AI_{suffix}"
    strong_code = f"CLOUD_{suffix}"
    weak_code = f"SHIP_{suffix}"
    snapshot_date = date(2099, 11, 1)

    for code in (industry_code, strong_code, weak_code):
        cleanup_industry(code)
    cleanup_momentum_date(snapshot_date)

    try:
        industry = create_industry(industry_code)

        duplicate_response = client.post(
            "/industries",
            json={
                "industry_code": industry_code,
                "industry_name": "Duplicate Industry",
                "market": "US",
                "description": "Duplicate",
            },
        )
        assert duplicate_response.status_code in (400, 409)

        momentum_response = post_momentum(industry["id"], snapshot_date)
        momentum = momentum_response.json()

        expected_score = (10 * 0.3) + (8 * 0.3) + (6 * 0.2) + (80 * 0.1) + (70 * 0.1)
        assert momentum_response.status_code in (200, 201)
        assert momentum["industry_id"] == industry["id"]
        assert momentum["momentum_score"] == expected_score

        strong_industry = create_industry(strong_code)
        weak_industry = create_industry(weak_code)

        strong_response = post_momentum(
            strong_industry["id"],
            snapshot_date,
            avg_return_1m=20,
            avg_return_3m=15,
            avg_return_6m=10,
            volume_score=90,
            trend_score=85,
        )
        weak_response = post_momentum(
            weak_industry["id"],
            snapshot_date,
            avg_return_1m=1,
            avg_return_3m=1,
            avg_return_6m=1,
            volume_score=10,
            trend_score=10,
        )

        assert strong_response.status_code in (200, 201)
        assert weak_response.status_code in (200, 201)

        recalculate_response = client.post("/industries/momentum/recalculate")
        assert recalculate_response.status_code == 200

        ranking_response = client.get("/industries/momentum/ranking")
        assert ranking_response.status_code == 200

        same_day_ranking = [
            item
            for item in ranking_response.json()
            if item["snapshot_date"] == snapshot_date.isoformat()
            and item["industry_id"]
            in {industry["id"], strong_industry["id"], weak_industry["id"]}
        ]

        assert len(same_day_ranking) == 3
        assert [item["ranking"] for item in same_day_ranking] == [1, 2, 3]
        assert same_day_ranking[0]["momentum_score"] >= same_day_ranking[1]["momentum_score"]
        assert same_day_ranking[1]["momentum_score"] >= same_day_ranking[2]["momentum_score"]

        latest_response = client.get("/industries/momentum/latest")
        latest = [
            item
            for item in latest_response.json()
            if item["snapshot_date"] == snapshot_date.isoformat()
            and item["industry_id"]
            in {industry["id"], strong_industry["id"], weak_industry["id"]}
        ]

        assert latest_response.status_code == 200
        assert len(latest) == 3
    finally:
        for code in (industry_code, strong_code, weak_code):
            cleanup_industry(code)
        cleanup_momentum_date(snapshot_date)
