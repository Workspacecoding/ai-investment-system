import sys
from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.asset import Asset, RecommendedAsset, UserWatchlist  # noqa: E402
from app.models.user import User  # noqa: E402


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


def create_asset(symbol: str, market: str = "US", asset_type: str = "stock"):
    response = client.post(
        "/assets",
        json={
            "symbol": symbol,
            "name": f"{symbol} Asset",
            "market": market,
            "asset_type": asset_type,
            "industry_id": None,
            "currency": "USD" if market == "US" else "TWD",
            "is_penny_stock": False,
            "is_active": True,
        },
    )
    assert response.status_code in (200, 201)
    return response.json()


def create_auth_headers(email: str, password: str = "12345678") -> dict[str, str]:
    register_response = client.post(
        "/register",
        json={
            "email": email,
            "password": password,
            "name": "Universe Test User",
        },
    )
    assert register_response.status_code in (200, 201)

    login_response = client.post(
        "/login",
        json={
            "email": email,
            "password": password,
        },
    )
    assert login_response.status_code == 200
    return {"Authorization": f"Bearer {login_response.json()['access_token']}"}


def test_universe_assets_watchlist_and_recommendations():
    suffix = uuid4().hex[:10].upper()
    symbol = f"T{suffix}"
    etf_symbol = f"E{suffix}"
    market = "US"
    email = f"test_user_{uuid4().hex}@example.com"
    other_email = f"test_user_{uuid4().hex}@example.com"
    recommendation_date = date(2099, 10, 1)

    cleanup_asset(symbol, market)
    cleanup_asset(etf_symbol, market)
    cleanup_user(email)
    cleanup_user(other_email)

    try:
        asset = create_asset(symbol, market=market, asset_type="stock")
        etf_asset = create_asset(etf_symbol, market=market, asset_type="etf")

        duplicate_response = client.post(
            "/assets",
            json={
                "symbol": symbol,
                "name": "Duplicate Asset",
                "market": market,
                "asset_type": "stock",
                "currency": "USD",
            },
        )
        assert duplicate_response.status_code in (400, 409)

        list_response = client.get("/assets")
        assert list_response.status_code == 200
        assert any(item["id"] == asset["id"] for item in list_response.json())

        market_filter_response = client.get("/assets", params={"market": market})
        assert market_filter_response.status_code == 200
        assert all(item["market"] == market for item in market_filter_response.json())

        type_filter_response = client.get("/assets", params={"asset_type": "etf"})
        assert type_filter_response.status_code == 200
        assert any(item["id"] == etf_asset["id"] for item in type_filter_response.json())

        unauthorized_watchlist_response = client.post(
            "/watchlist",
            json={"asset_id": asset["id"], "note": "No token"},
        )
        assert unauthorized_watchlist_response.status_code in (401, 403)

        headers = create_auth_headers(email)
        other_headers = create_auth_headers(other_email)

        watchlist_response = client.post(
            "/watchlist",
            json={"asset_id": asset["id"], "note": "My watch"},
            headers=headers,
        )
        assert watchlist_response.status_code in (200, 201)
        assert watchlist_response.json()["asset_id"] == asset["id"]

        other_watchlist_response = client.post(
            "/watchlist",
            json={"asset_id": etf_asset["id"], "note": "Other watch"},
            headers=other_headers,
        )
        assert other_watchlist_response.status_code in (200, 201)

        watchlist_list_response = client.get("/watchlist", headers=headers)
        watchlist_items = watchlist_list_response.json()

        assert watchlist_list_response.status_code == 200
        assert any(item["asset_id"] == asset["id"] for item in watchlist_items)
        assert all(item["asset_id"] != etf_asset["id"] for item in watchlist_items)

        delete_response = client.delete(f"/watchlist/{asset['id']}", headers=headers)
        assert delete_response.status_code == 204

        after_delete_response = client.get("/watchlist", headers=headers)
        assert all(
            item["asset_id"] != asset["id"] for item in after_delete_response.json()
        )

        recommended_response = client.post(
            "/recommended-assets",
            json={
                "asset_id": asset["id"],
                "recommendation_date": recommendation_date.isoformat(),
                "source": "system",
                "reason": "Initial recommendation",
                "score": 88.5,
            },
        )
        recommended = recommended_response.json()

        assert recommended_response.status_code in (200, 201)
        assert recommended["asset_id"] == asset["id"]
        assert recommended["score"] == 88.5

        updated_recommended_response = client.post(
            "/recommended-assets",
            json={
                "asset_id": asset["id"],
                "recommendation_date": recommendation_date.isoformat(),
                "source": "system",
                "reason": "Updated recommendation",
                "score": 91.25,
            },
        )
        updated_recommended = updated_recommended_response.json()

        assert updated_recommended_response.status_code in (200, 201)
        assert updated_recommended["id"] == recommended["id"]
        assert updated_recommended["score"] == 91.25

        recommended_list_response = client.get(
            "/recommended-assets",
            params={"recommendation_date": recommendation_date.isoformat()},
        )
        matching_recommendations = [
            item
            for item in recommended_list_response.json()
            if item["asset_id"] == asset["id"] and item["source"] == "system"
        ]

        assert recommended_list_response.status_code == 200
        assert len(matching_recommendations) == 1
    finally:
        cleanup_user(email)
        cleanup_user(other_email)
        cleanup_asset(symbol, market)
        cleanup_asset(etf_symbol, market)
