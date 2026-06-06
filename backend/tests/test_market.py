import sys
from datetime import date
from pathlib import Path

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.market import MarketSnapshot  # noqa: E402


client = TestClient(app)


def cleanup_snapshot(snapshot_date: date):
    db = SessionLocal()
    try:
        db.query(MarketSnapshot).filter(
            MarketSnapshot.snapshot_date == snapshot_date
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def make_payload(snapshot_date: date, **overrides):
    payload = {
        "snapshot_date": snapshot_date.isoformat(),
        "nasdaq_change_percent": 1.2,
        "sp500_change_percent": 0.8,
        "twii_change_percent": 0.5,
        "vix_value": 18.0,
        "us10y_value": 4.5,
    }
    payload.update(overrides)
    return payload


def test_create_and_update_market_snapshot():
    snapshot_date = date(2099, 12, 20)
    cleanup_snapshot(snapshot_date)

    try:
        create_response = client.post(
            "/market/snapshots",
            json=make_payload(snapshot_date),
        )
        created = create_response.json()

        assert create_response.status_code == 200
        assert "id" in created
        assert created["snapshot_date"] == snapshot_date.isoformat()
        assert created["market_regime"] == "bull"

        update_response = client.post(
            "/market/snapshots",
            json=make_payload(
                snapshot_date,
                nasdaq_change_percent=-1.0,
                sp500_change_percent=-1.0,
                twii_change_percent=-1.0,
                vix_value=25.0,
                us10y_value=6.0,
            ),
        )
        updated = update_response.json()

        assert update_response.status_code == 200
        assert updated["id"] == created["id"]
        assert updated["market_regime"] == "bear"

        list_response = client.get("/market/snapshots")
        matching = [
            snapshot
            for snapshot in list_response.json()
            if snapshot["snapshot_date"] == snapshot_date.isoformat()
        ]

        assert list_response.status_code == 200
        assert len(matching) == 1
    finally:
        cleanup_snapshot(snapshot_date)


def test_latest_market_snapshot():
    older_date = date(2099, 12, 30)
    newer_date = date(2099, 12, 31)
    cleanup_snapshot(older_date)
    cleanup_snapshot(newer_date)

    try:
        older_response = client.post(
            "/market/snapshots",
            json=make_payload(older_date),
        )
        newer_response = client.post(
            "/market/snapshots",
            json=make_payload(newer_date, nasdaq_change_percent=2.5),
        )
        latest_response = client.get("/market/snapshots/latest")
        latest = latest_response.json()

        assert older_response.status_code == 200
        assert newer_response.status_code == 200
        assert latest_response.status_code == 200
        assert latest["snapshot_date"] == newer_date.isoformat()
    finally:
        cleanup_snapshot(older_date)
        cleanup_snapshot(newer_date)


def test_market_regime_bull_sideways_bear():
    bull_date = date(2099, 12, 21)
    sideways_date = date(2099, 12, 22)
    bear_date = date(2099, 12, 23)
    for snapshot_date in (bull_date, sideways_date, bear_date):
        cleanup_snapshot(snapshot_date)

    try:
        bull_response = client.post(
            "/market/snapshots",
            json=make_payload(bull_date),
        )
        sideways_response = client.post(
            "/market/snapshots",
            json=make_payload(
                sideways_date,
                nasdaq_change_percent=1.0,
                sp500_change_percent=1.0,
                twii_change_percent=-1.0,
                vix_value=25.0,
                us10y_value=6.0,
            ),
        )
        bear_response = client.post(
            "/market/snapshots",
            json=make_payload(
                bear_date,
                nasdaq_change_percent=-1.0,
                sp500_change_percent=-1.0,
                twii_change_percent=-1.0,
                vix_value=25.0,
                us10y_value=6.0,
            ),
        )

        bull = bull_response.json()
        sideways = sideways_response.json()
        bear = bear_response.json()

        assert bull_response.status_code == 200
        assert bull["market_score"] >= 70
        assert bull["market_regime"] == "bull"

        assert sideways_response.status_code == 200
        assert 40 <= sideways["market_score"] < 70
        assert sideways["market_regime"] == "sideways"

        assert bear_response.status_code == 200
        assert bear["market_score"] < 40
        assert bear["market_regime"] == "bear"
    finally:
        for snapshot_date in (bull_date, sideways_date, bear_date):
            cleanup_snapshot(snapshot_date)
