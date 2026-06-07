import sys
from datetime import date, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.asset import Asset, RecommendedAsset, UserWatchlist  # noqa: E402
from app.models.factor import FactorScore  # noqa: E402
from app.models.indicator import TechnicalIndicator  # noqa: E402
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


def create_asset(symbol: str, market: str = "US"):
    response = client.post(
        "/assets",
        json={
            "symbol": symbol,
            "name": f"{symbol} Price Level Asset",
            "market": market,
            "asset_type": "stock",
            "industry_id": None,
            "currency": "USD",
            "is_penny_stock": False,
            "is_active": True,
        },
    )
    assert response.status_code in (200, 201)
    return response.json()


def insert_prices(asset_id: int, start_date: date):
    db = SessionLocal()
    try:
        db.add_all(
            [
                AssetPrice(
                    asset_id=asset_id,
                    trade_date=start_date + timedelta(days=index),
                    open_price=(100 + index) - 1,
                    high_price=(100 + index) + 1,
                    low_price=(100 + index) - 2,
                    close_price=100 + index,
                    volume=1000,
                )
                for index in range(1, 60)
            ]
        )
        db.commit()
    finally:
        db.close()


def price_payload(trade_date: date, close_price: float):
    return {
        "trade_date": trade_date.isoformat(),
        "open_price": close_price - 1,
        "high_price": close_price + 1,
        "low_price": close_price - 2,
        "close_price": close_price,
        "volume": 1000,
    }


def test_price_level_calculation_flow():
    suffix = uuid4().hex[:10].upper()
    symbol = f"L{suffix}"
    market = "US"
    cleanup_asset(symbol, market)

    try:
        asset = create_asset(symbol, market)
        asset_id = asset["id"]
        start_date = date(2099, 8, 1)

        first_response = client.post(
            f"/assets/{asset_id}/prices",
            json=price_payload(start_date, 100),
        )
        assert first_response.status_code == 200

        insert_prices(asset_id, start_date)

        calculate_response = client.post(f"/assets/{asset_id}/price-levels/calculate")
        levels = calculate_response.json()

        assert calculate_response.status_code == 200
        assert len(levels) == 60

        latest_response = client.get(f"/assets/{asset_id}/price-levels/latest")
        latest = latest_response.json()
        expected_percentile = (159 - 100) / (159 - 100)

        assert latest_response.status_code == 200
        assert latest["trade_date"] == (start_date + timedelta(days=59)).isoformat()
        assert latest["current_price"] == 159.0
        assert latest["high_52w"] == 159.0
        assert latest["low_52w"] == 100.0
        assert latest["high_all_time"] == 159.0
        assert latest["low_all_time"] == 100.0
        assert latest["percentile_52w"] == expected_percentile
        assert latest["percentile_all_time"] == expected_percentile
        assert latest["level_52w"] == "very_high"
        assert latest["level_all_time"] == "very_high"

        list_response = client.get(f"/assets/{asset_id}/price-levels")
        assert list_response.status_code == 200
        assert len(list_response.json()) == 60
    finally:
        cleanup_asset(symbol, market)
