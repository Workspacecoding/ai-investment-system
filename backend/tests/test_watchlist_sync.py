import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.asset import Asset, RecommendedAsset, UserWatchlist  # noqa: E402
from app.models.industry import Industry, IndustryMomentum  # noqa: E402
from app.models.price import AssetPrice  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.watchlist_sync_service import cleanup_old_price_data  # noqa: E402


client = TestClient(app)


def cleanup_user(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
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


def create_headers(email: str):
    cleanup_user(email)
    password = "12345678"
    register_response = client.post(
        "/register",
        json={"email": email, "password": password, "name": "Sync User"},
    )
    assert register_response.status_code in (200, 201)
    login_response = client.post("/login", json={"email": email, "password": password})
    assert login_response.status_code == 200
    return {"Authorization": f"Bearer {login_response.json()['access_token']}"}


def seed_industry(code: str) -> int:
    db = SessionLocal()
    try:
        industry = Industry(
            industry_code=code,
            industry_name=f"{code} Industry",
            market="US",
            description="Sync test industry",
        )
        db.add(industry)
        db.commit()
        db.refresh(industry)
        return industry.id
    finally:
        db.close()


def seed_asset(symbol: str, industry_id: int | None = None) -> int:
    db = SessionLocal()
    try:
        asset = Asset(
            symbol=symbol,
            name=f"{symbol} Sync Asset",
            market="US",
            asset_type="stock",
            industry_id=industry_id,
            currency="USD",
            is_penny_stock=False,
            is_active=True,
            data_sync_enabled=False,
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset.id
    finally:
        db.close()


def get_asset(asset_id: int) -> Asset:
    db = SessionLocal()
    try:
        return db.query(Asset).filter(Asset.id == asset_id).first()
    finally:
        db.close()


def test_watchlist_sync_flow_permissions_and_cleanup():
    suffix = uuid4().hex[:10].upper()
    email = f"sync_{suffix}@example.com"
    other_email = f"sync_other_{suffix}@example.com"
    industry_code = f"SYNC_{suffix}"
    symbol = f"SYN{suffix}"
    industry_symbol = f"SYI{suffix}"

    cleanup_user(email)
    cleanup_user(other_email)
    cleanup_asset(symbol)
    cleanup_asset(industry_symbol)
    cleanup_industry(industry_code)

    try:
        headers = create_headers(email)
        other_headers = create_headers(other_email)
        industry_id = seed_industry(industry_code)
        asset_id = seed_asset(symbol)
        industry_asset_id = seed_asset(industry_symbol, industry_id)

        watchlist_response = client.post(
            "/watchlist",
            headers=headers,
            json={"asset_id": asset_id, "note": "Sync me"},
        )
        assert watchlist_response.status_code in (200, 201)

        forbidden_response = client.post(
            f"/watchlist/{asset_id}/sync/start",
            headers=other_headers,
        )
        assert forbidden_response.status_code in (401, 403, 404)

        start_response = client.post(f"/watchlist/{asset_id}/sync/start", headers=headers)
        watchlist = start_response.json()
        expected_start_date = date.today() - timedelta(days=365 * 10)

        assert start_response.status_code == 200
        assert watchlist["inserted_count"] > 0
        assert watchlist["skipped_duplicate_count"] == 0
        assert watchlist["warning_count"] == 0
        assert watchlist["start_date"] == expected_start_date.isoformat()
        assert watchlist["end_date"] == date.today().isoformat()
        assert watchlist["is_sync_enabled"] is True
        assert watchlist["sync_start_date"] == expected_start_date.isoformat()
        assert watchlist["sync_end_date"] == date.today().isoformat()
        assert get_asset(asset_id).data_sync_enabled is True

        prices_response = client.get(
            f"/assets/{asset_id}/prices"
            f"?start_date={expected_start_date.isoformat()}&end_date={date.today().isoformat()}"
        )
        prices = prices_response.json()
        assert prices_response.status_code == 200
        assert len(prices) > 0

        db = SessionLocal()
        try:
            db.add(
                AssetPrice(
                    asset_id=asset_id,
                    trade_date=date.today() - timedelta(days=(365 * 10) + 30),
                    open_price=1,
                    high_price=1,
                    low_price=1,
                    close_price=1,
                    volume=1,
                    created_at=datetime.utcnow(),
                )
            )
            db.commit()
            deleted_count = cleanup_old_price_data(db, asset_id)
            assert deleted_count >= 1
            old_count = (
                db.query(AssetPrice)
                .filter(
                    AssetPrice.asset_id == asset_id,
                    AssetPrice.trade_date < expected_start_date,
                )
                .count()
            )
            assert old_count == 0
        finally:
            db.close()

        stop_response = client.post(f"/watchlist/{asset_id}/sync/stop", headers=headers)
        assert stop_response.status_code == 200
        assert stop_response.json()["is_sync_enabled"] is False

        client.post(
            "/watchlist",
            headers=headers,
            json={"asset_id": asset_id, "note": "Remove me"},
        )
        delete_response = client.delete(f"/watchlist/{asset_id}", headers=headers)
        assert delete_response.status_code == 204
        assert get_asset(asset_id).data_sync_enabled is False

        industry_start_response = client.post(f"/industries/{industry_id}/sync/start")
        assert industry_start_response.status_code == 200
        assert get_asset(industry_asset_id).data_sync_enabled is True

        industry_stop_response = client.post(f"/industries/{industry_id}/sync/stop")
        assert industry_stop_response.status_code == 200
        assert get_asset(industry_asset_id).data_sync_enabled is False
    finally:
        cleanup_user(email)
        cleanup_user(other_email)
        cleanup_asset(symbol)
        cleanup_asset(industry_symbol)
        cleanup_industry(industry_code)


def test_watchlist_sync_deduplicates_prices_and_reports_counts(monkeypatch):
    suffix = uuid4().hex[:10].upper()
    email = f"sync_dedupe_{suffix}@example.com"
    symbol = f"SYD{suffix}"
    trade_date = date.today() - timedelta(days=1)

    cleanup_user(email)
    cleanup_asset(symbol)

    identical_price = {
        "trade_date": trade_date,
        "open_price": 100,
        "high_price": 105,
        "low_price": 98,
        "close_price": 102,
        "volume": 1000,
    }
    conflicting_price = {
        "trade_date": trade_date,
        "open_price": 101,
        "high_price": 106,
        "low_price": 99,
        "close_price": 103,
        "volume": 2000,
    }

    try:
        headers = create_headers(email)
        asset_id = seed_asset(symbol)
        watchlist_response = client.post(
            "/watchlist",
            headers=headers,
            json={"asset_id": asset_id, "note": "Deduplicate me"},
        )
        assert watchlist_response.status_code in (200, 201)

        monkeypatch.setattr(
            "app.services.watchlist_sync_service.fetch_daily_prices",
            lambda symbol, market, start_date, end_date: [identical_price],
        )

        first_response = client.post(f"/watchlist/{asset_id}/sync/start", headers=headers)
        assert first_response.status_code == 200
        assert first_response.json()["inserted_count"] == 1
        assert first_response.json()["skipped_duplicate_count"] == 0
        assert first_response.json()["warning_count"] == 0

        second_response = client.post(f"/watchlist/{asset_id}/sync/start", headers=headers)
        assert second_response.status_code == 200
        assert second_response.json()["inserted_count"] == 0
        assert second_response.json()["skipped_duplicate_count"] == 1
        assert second_response.json()["warning_count"] == 0

        db = SessionLocal()
        try:
            price_count = (
                db.query(AssetPrice)
                .filter(AssetPrice.asset_id == asset_id, AssetPrice.trade_date == trade_date)
                .count()
            )
            original_price = (
                db.query(AssetPrice)
                .filter(AssetPrice.asset_id == asset_id, AssetPrice.trade_date == trade_date)
                .first()
            )
            assert price_count == 1
            assert float(original_price.close_price) == 102
            assert original_price.volume == 1000
        finally:
            db.close()

        monkeypatch.setattr(
            "app.services.watchlist_sync_service.fetch_daily_prices",
            lambda symbol, market, start_date, end_date: [conflicting_price],
        )

        conflict_response = client.post(f"/watchlist/{asset_id}/sync/start", headers=headers)
        assert conflict_response.status_code == 200
        assert conflict_response.json()["inserted_count"] == 0
        assert conflict_response.json()["skipped_duplicate_count"] == 0
        assert conflict_response.json()["warning_count"] == 1

        db = SessionLocal()
        try:
            price_count = (
                db.query(AssetPrice)
                .filter(AssetPrice.asset_id == asset_id, AssetPrice.trade_date == trade_date)
                .count()
            )
            unchanged_price = (
                db.query(AssetPrice)
                .filter(AssetPrice.asset_id == asset_id, AssetPrice.trade_date == trade_date)
                .first()
            )
            assert price_count == 1
            assert float(unchanged_price.close_price) == 102
            assert unchanged_price.volume == 1000
        finally:
            db.close()
    finally:
        cleanup_user(email)
        cleanup_asset(symbol)
