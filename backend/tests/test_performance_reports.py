import sys
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.asset import Asset  # noqa: E402
from app.models.monthly_report import PerformanceReport, StrategyPerformance  # noqa: E402
from app.models.paper_trading import PaperPortfolio, PaperTradeLog  # noqa: E402
from app.models.user import User  # noqa: E402


client = TestClient(app)


def cleanup_user(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            portfolios = db.query(PaperPortfolio).filter(PaperPortfolio.user_id == user.id).all()
            for portfolio in portfolios:
                db.query(StrategyPerformance).filter(
                    StrategyPerformance.portfolio_id == portfolio.id
                ).delete(synchronize_session=False)
                db.query(PerformanceReport).filter(
                    PerformanceReport.portfolio_id == portfolio.id
                ).delete(synchronize_session=False)
                db.query(PaperTradeLog).filter(
                    PaperTradeLog.portfolio_id == portfolio.id
                ).delete(synchronize_session=False)
                db.delete(portfolio)
            db.delete(user)
            db.commit()
    finally:
        db.close()


def cleanup_asset(symbol: str):
    db = SessionLocal()
    try:
        asset = db.query(Asset).filter(Asset.symbol == symbol, Asset.market == "US").first()
        if asset:
            db.query(PaperTradeLog).filter(PaperTradeLog.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.delete(asset)
            db.commit()
    finally:
        db.close()


def create_headers(email: str) -> dict[str, str]:
    password = "12345678"
    response = client.post(
        "/register",
        json={"email": email, "password": password, "name": "Report User"},
    )
    assert response.status_code in (200, 201)
    login = client.post("/login", json={"email": email, "password": password})
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def seed_asset(symbol: str) -> int:
    db = SessionLocal()
    try:
        asset = Asset(
            symbol=symbol,
            name=f"{symbol} Report Asset",
            market="US",
            asset_type="stock",
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


def seed_report_data(user_email: str, best_symbol: str, worst_symbol: str):
    headers = create_headers(user_email)
    portfolio_response = client.post(
        "/paper-portfolios",
        json={"name": "Report Portfolio", "initial_cash": 10000},
        headers=headers,
    )
    assert portfolio_response.status_code == 200
    portfolio_id = portfolio_response.json()["id"]
    best_asset_id = seed_asset(best_symbol)
    worst_asset_id = seed_asset(worst_symbol)

    db = SessionLocal()
    try:
        portfolio = db.query(PaperPortfolio).filter(PaperPortfolio.id == portfolio_id).first()
        portfolio.total_equity = 11000
        portfolio.realized_pnl = 200
        portfolio.unrealized_pnl = 800
        db.add_all(
            [
                PaperTradeLog(
                    portfolio_id=portfolio_id,
                    asset_id=best_asset_id,
                    realized_pnl=300,
                    realized_pnl_percent=10,
                    holding_days=5,
                    strategy_type="pullback_buy",
                    created_at=datetime(2099, 4, 5),
                ),
                PaperTradeLog(
                    portfolio_id=portfolio_id,
                    asset_id=worst_asset_id,
                    realized_pnl=-100,
                    realized_pnl_percent=-5,
                    holding_days=3,
                    strategy_type="pullback_buy",
                    created_at=datetime(2099, 4, 10),
                ),
                PaperTradeLog(
                    portfolio_id=portfolio_id,
                    asset_id=best_asset_id,
                    realized_pnl=50,
                    realized_pnl_percent=2,
                    holding_days=2,
                    strategy_type="trend_follow",
                    created_at=datetime(2099, 4, 15),
                ),
            ]
        )
        db.commit()
    finally:
        db.close()

    return headers, portfolio_id, best_asset_id, worst_asset_id


def test_performance_report_generation_and_permissions():
    suffix = uuid4().hex[:10].upper()
    email = f"report_{uuid4().hex}@example.com"
    other_email = f"report_{uuid4().hex}@example.com"
    best_symbol = f"RB{suffix}"
    worst_symbol = f"RW{suffix}"
    cleanup_user(email)
    cleanup_user(other_email)
    cleanup_asset(best_symbol)
    cleanup_asset(worst_symbol)

    try:
        headers, portfolio_id, best_asset_id, worst_asset_id = seed_report_data(
            email, best_symbol, worst_symbol
        )
        other_headers = create_headers(other_email)

        forbidden_response = client.get(
            f"/paper-portfolios/{portfolio_id}/reports",
            headers=other_headers,
        )
        assert forbidden_response.status_code in (401, 403, 404)

        generate_response = client.post(
            f"/paper-portfolios/{portfolio_id}/reports/generate",
            params={"year": 2099, "month": 4},
            headers=headers,
        )
        report = generate_response.json()

        assert generate_response.status_code == 200
        assert report["total_return_percent"] == 10.0
        assert report["win_rate"] == round((2 / 3) * 100, 4)
        assert report["max_drawdown"] == round((100 / 10300) * 100, 4)
        assert report["best_asset_id"] == best_asset_id
        assert report["worst_asset_id"] == worst_asset_id

        latest_response = client.get(
            f"/paper-portfolios/{portfolio_id}/reports/latest",
            headers=headers,
        )
        assert latest_response.status_code == 200
        assert latest_response.json()["id"] == report["id"]

        list_response = client.get(
            f"/paper-portfolios/{portfolio_id}/reports",
            headers=headers,
        )
        assert list_response.status_code == 200
        assert any(item["id"] == report["id"] for item in list_response.json())

        strategy_response = client.get(
            f"/paper-portfolios/{portfolio_id}/strategy-performance",
            headers=headers,
        )
        strategies = strategy_response.json()
        pullback = next(item for item in strategies if item["strategy_type"] == "pullback_buy")

        assert strategy_response.status_code == 200
        assert pullback["total_trades"] == 2
        assert pullback["win_rate"] == 50.0
        assert pullback["avg_profit_percent"] == 10.0
        assert pullback["avg_loss_percent"] == -5.0
        assert pullback["net_return_percent"] == 5.0
    finally:
        cleanup_user(email)
        cleanup_user(other_email)
        cleanup_asset(best_symbol)
        cleanup_asset(worst_symbol)
