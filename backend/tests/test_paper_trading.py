import sys
from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.asset import Asset, RecommendedAsset, UserWatchlist  # noqa: E402
from app.models.paper_trading import (  # noqa: E402
    PaperOrder,
    PaperPortfolio,
    PaperPosition,
    PaperTradeLog,
)
from app.models.price import AssetPrice  # noqa: E402
from app.models.user import User  # noqa: E402


client = TestClient(app)


def cleanup_user(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            portfolios = (
                db.query(PaperPortfolio).filter(PaperPortfolio.user_id == user.id).all()
            )
            for portfolio in portfolios:
                db.query(PaperTradeLog).filter(
                    PaperTradeLog.portfolio_id == portfolio.id
                ).delete(synchronize_session=False)
                db.query(PaperOrder).filter(
                    PaperOrder.portfolio_id == portfolio.id
                ).delete(synchronize_session=False)
                db.query(PaperPosition).filter(
                    PaperPosition.portfolio_id == portfolio.id
                ).delete(synchronize_session=False)
                db.delete(portfolio)
            db.delete(user)
            db.commit()
    finally:
        db.close()


def cleanup_asset(symbol: str, market: str):
    db = SessionLocal()
    try:
        asset = (
            db.query(Asset)
            .filter(Asset.symbol == symbol, Asset.market == market)
            .first()
        )
        if asset:
            db.query(PaperTradeLog).filter(PaperTradeLog.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(PaperOrder).filter(PaperOrder.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(PaperPosition).filter(PaperPosition.asset_id == asset.id).delete(
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


def create_auth_headers(email: str, password: str = "12345678") -> dict[str, str]:
    register_response = client.post(
        "/register",
        json={"email": email, "password": password, "name": "Paper Test User"},
    )
    assert register_response.status_code in (200, 201)
    login_response = client.post(
        "/login",
        json={"email": email, "password": password},
    )
    assert login_response.status_code == 200
    return {"Authorization": f"Bearer {login_response.json()['access_token']}"}


def create_asset_with_price(symbol: str, market: str = "US"):
    response = client.post(
        "/assets",
        json={
            "symbol": symbol,
            "name": f"{symbol} Paper Asset",
            "market": market,
            "asset_type": "stock",
            "industry_id": None,
            "currency": "USD",
            "is_penny_stock": False,
            "is_active": True,
        },
    )
    assert response.status_code in (200, 201)
    asset = response.json()
    db = SessionLocal()
    try:
        db.add(
            AssetPrice(
                asset_id=asset["id"],
                trade_date=date(2099, 5, 1),
                open_price=119,
                high_price=125,
                low_price=118,
                close_price=120,
                volume=1000,
            )
        )
        db.commit()
    finally:
        db.close()
    return asset


def test_paper_trading_flow_and_permissions():
    suffix = uuid4().hex[:10].upper()
    symbol = f"P{suffix}"
    email = f"paper_{uuid4().hex}@example.com"
    other_email = f"paper_{uuid4().hex}@example.com"
    cleanup_asset(symbol, "US")
    cleanup_user(email)
    cleanup_user(other_email)

    try:
        asset = create_asset_with_price(symbol)
        headers = create_auth_headers(email)
        other_headers = create_auth_headers(other_email)

        unauth_response = client.post(
            "/paper-portfolios",
            json={"name": "No Auth", "initial_cash": 10000},
        )
        assert unauth_response.status_code in (401, 403)

        portfolio_response = client.post(
            "/paper-portfolios",
            json={"name": "Main Portfolio", "initial_cash": 10000},
            headers=headers,
        )
        portfolio = portfolio_response.json()
        assert portfolio_response.status_code == 200
        assert portfolio["cash_balance"] == 10000.0
        assert portfolio["total_equity"] == 10000.0

        other_access_response = client.get(
            f"/paper-portfolios/{portfolio['id']}",
            headers=other_headers,
        )
        assert other_access_response.status_code in (401, 403, 404)

        buy_response = client.post(
            f"/paper-portfolios/{portfolio['id']}/buy",
            json={"asset_id": asset["id"], "quantity": 10, "price": 100},
            headers=headers,
        )
        buy_order = buy_response.json()
        assert buy_response.status_code == 200
        assert buy_order["amount"] == 1000.0

        portfolio_after_buy = client.get(
            f"/paper-portfolios/{portfolio['id']}",
            headers=headers,
        ).json()
        assert portfolio_after_buy["cash_balance"] == 9000.0

        positions_response = client.get(
            f"/paper-portfolios/{portfolio['id']}/positions",
            headers=headers,
        )
        positions = positions_response.json()
        assert positions_response.status_code == 200
        assert len(positions) == 1
        assert positions[0]["quantity"] == 10.0
        assert positions[0]["avg_cost"] == 100.0

        second_buy_response = client.post(
            f"/paper-portfolios/{portfolio['id']}/buy",
            json={"asset_id": asset["id"], "quantity": 10, "price": 120},
            headers=headers,
        )
        assert second_buy_response.status_code == 200

        positions_after_second_buy = client.get(
            f"/paper-portfolios/{portfolio['id']}/positions",
            headers=headers,
        ).json()
        assert positions_after_second_buy[0]["quantity"] == 20.0
        assert positions_after_second_buy[0]["avg_cost"] == 110.0

        insufficient_cash_response = client.post(
            f"/paper-portfolios/{portfolio['id']}/buy",
            json={"asset_id": asset["id"], "quantity": 1000, "price": 1000},
            headers=headers,
        )
        assert insufficient_cash_response.status_code in (400, 422)

        sell_response = client.post(
            f"/paper-portfolios/{portfolio['id']}/sell",
            json={"asset_id": asset["id"], "quantity": 5, "price": 130},
            headers=headers,
        )
        sell_order = sell_response.json()
        assert sell_response.status_code == 200
        assert sell_order["amount"] == 650.0

        portfolio_after_sell = client.get(
            f"/paper-portfolios/{portfolio['id']}",
            headers=headers,
        ).json()
        assert portfolio_after_sell["cash_balance"] == 8450.0
        assert portfolio_after_sell["realized_pnl"] == 100.0

        trade_logs_response = client.get(
            f"/paper-portfolios/{portfolio['id']}/trade-logs",
            headers=headers,
        )
        trade_logs = trade_logs_response.json()
        assert trade_logs_response.status_code == 200
        assert trade_logs[0]["realized_pnl"] == 100.0
        assert trade_logs[0]["realized_pnl_percent"] == round((100 / (110 * 5)) * 100, 4)

        oversell_response = client.post(
            f"/paper-portfolios/{portfolio['id']}/sell",
            json={"asset_id": asset["id"], "quantity": 100, "price": 130},
            headers=headers,
        )
        assert oversell_response.status_code in (400, 422)

        update_response = client.post(
            f"/paper-portfolios/{portfolio['id']}/positions/update",
            headers=headers,
        )
        updated_portfolio = update_response.json()
        assert update_response.status_code == 200
        assert updated_portfolio["total_market_value"] == 1800.0
        assert updated_portfolio["unrealized_pnl"] == 150.0

        updated_positions = client.get(
            f"/paper-portfolios/{portfolio['id']}/positions",
            headers=headers,
        ).json()
        assert updated_positions[0]["current_price"] == 120.0
        assert updated_positions[0]["unrealized_pnl"] == 150.0

        orders_response = client.get(
            f"/paper-portfolios/{portfolio['id']}/orders",
            headers=headers,
        )
        assert orders_response.status_code == 200
        assert len(orders_response.json()) == 3
    finally:
        cleanup_user(email)
        cleanup_user(other_email)
        cleanup_asset(symbol, "US")
