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
            "name": f"{symbol} Indicator Asset",
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


def price_payload(trade_date: date, close_price: float, volume: int = 1000):
    return {
        "trade_date": trade_date.isoformat(),
        "open_price": close_price - 1,
        "high_price": close_price + 1,
        "low_price": close_price - 2,
        "close_price": close_price,
        "volume": volume,
    }


def test_indicator_factor_pool_flow():
    suffix = uuid4().hex[:10].upper()
    symbol = f"I{suffix}"
    market = "US"
    cleanup_asset(symbol, market)

    try:
        asset = create_asset(symbol, market)
        asset_id = asset["id"]
        start_date = date(2099, 9, 1)

        first_response = client.post(
            f"/assets/{asset_id}/prices",
            json=price_payload(start_date, 101),
        )
        assert first_response.status_code == 200

        updated_first_response = client.post(
            f"/assets/{asset_id}/prices",
            json=price_payload(start_date, 101.5),
        )
        assert updated_first_response.status_code == 200
        assert updated_first_response.json()["id"] == first_response.json()["id"]
        assert updated_first_response.json()["close_price"] == 101.5

        for day in range(2, 21):
            trade_date = start_date + timedelta(days=day - 1)
            volume = 2000 if day == 20 else 1000
            response = client.post(
                f"/assets/{asset_id}/prices",
                json=price_payload(trade_date, 100 + day, volume),
            )
            assert response.status_code == 200

        prices_response = client.get(f"/assets/{asset_id}/prices")
        prices = prices_response.json()

        assert prices_response.status_code == 200
        assert len(prices) == 20
        assert prices[0]["close_price"] == 101.5

        indicators_response = client.post(f"/assets/{asset_id}/indicators/calculate")
        indicators = indicators_response.json()
        latest_indicator = indicators[-1]

        assert indicators_response.status_code == 200
        assert len(indicators) == 20
        assert latest_indicator["ma5"] == 118.0
        assert latest_indicator["ma10"] == 115.5
        assert latest_indicator["ma20"] == 110.525
        assert latest_indicator["volume_ma5"] == 1200.0
        assert latest_indicator["volume_ratio"] == 1.6667
        assert latest_indicator["change_percent"] == round(((120 - 119) / 119) * 100, 4)
        assert latest_indicator["is_uptrend"] is True

        indicators_list_response = client.get(f"/assets/{asset_id}/indicators")
        assert indicators_list_response.status_code == 200
        assert len(indicators_list_response.json()) == 20

        factors_response = client.post(f"/assets/{asset_id}/factors/generate")
        factors = factors_response.json()

        assert factors_response.status_code == 200
        assert len(factors) == 80

        second_factors_response = client.post(f"/assets/{asset_id}/factors/generate")
        second_factors = second_factors_response.json()

        assert second_factors_response.status_code == 200
        assert len(second_factors) == 80
        assert {factor["id"] for factor in second_factors} == {
            factor["id"] for factor in factors
        }

        factors_list_response = client.get(f"/assets/{asset_id}/factors")
        factors_list = factors_list_response.json()

        assert factors_list_response.status_code == 200
        assert len(factors_list) == 80
        assert any(factor["factor_name"] == "uptrend_score" for factor in factors_list)
    finally:
        cleanup_asset(symbol, market)
