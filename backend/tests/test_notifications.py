import sys
from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.asset import Asset, RecommendedAsset, UserWatchlist  # noqa: E402
from app.models.asset_score import AssetScore  # noqa: E402
from app.models.market import MarketSnapshot  # noqa: E402
from app.models.monthly_report import PerformanceReport  # noqa: E402
from app.models.notification import NotificationLog, NotificationSetting  # noqa: E402
from app.models.paper_trading import PaperPortfolio  # noqa: E402
from app.models.price import AssetPrice  # noqa: E402
from app.models.swing_trade import SwingTradeSetup  # noqa: E402
from app.models.trade_plan import TradePlan  # noqa: E402
from app.models.user import User  # noqa: E402


client = TestClient(app)


def cleanup_user(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            portfolio_ids = [
                row[0]
                for row in db.query(PaperPortfolio.id)
                .filter(PaperPortfolio.user_id == user.id)
                .all()
            ]
            if portfolio_ids:
                db.query(PerformanceReport).filter(
                    PerformanceReport.portfolio_id.in_(portfolio_ids)
                ).delete(synchronize_session=False)
            db.query(NotificationLog).filter(NotificationLog.user_id == user.id).delete(
                synchronize_session=False
            )
            db.query(NotificationSetting).filter(
                NotificationSetting.user_id == user.id
            ).delete(synchronize_session=False)
            db.query(UserWatchlist).filter(UserWatchlist.user_id == user.id).delete(
                synchronize_session=False
            )
            db.query(PaperPortfolio).filter(PaperPortfolio.user_id == user.id).delete(
                synchronize_session=False
            )
            db.delete(user)
            db.commit()
    finally:
        db.close()


def cleanup_asset(symbol: str):
    db = SessionLocal()
    try:
        asset = db.query(Asset).filter(Asset.symbol == symbol, Asset.market == "US").first()
        if asset:
            db.query(NotificationLog).filter(NotificationLog.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(UserWatchlist).filter(UserWatchlist.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(TradePlan).filter(TradePlan.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(SwingTradeSetup).filter(SwingTradeSetup.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(AssetScore).filter(AssetScore.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(AssetPrice).filter(AssetPrice.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(RecommendedAsset).filter(RecommendedAsset.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.delete(asset)
            db.commit()
    finally:
        db.close()


def cleanup_market_dates(*dates: date):
    db = SessionLocal()
    try:
        db.query(MarketSnapshot).filter(MarketSnapshot.snapshot_date.in_(dates)).delete(
            synchronize_session=False
        )
        db.commit()
    finally:
        db.close()


def create_headers(email: str):
    cleanup_user(email)
    password = "12345678"
    register_response = client.post(
        "/register",
        json={"email": email, "password": password, "name": "Notification User"},
    )
    assert register_response.status_code in (200, 201)
    login_response = client.post("/login", json={"email": email, "password": password})
    assert login_response.status_code == 200
    return {"Authorization": f"Bearer {login_response.json()['access_token']}"}


def seed_asset(symbol: str) -> int:
    db = SessionLocal()
    try:
        asset = Asset(
            symbol=symbol,
            name=f"{symbol} Notification Asset",
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


def seed_watchlist(user_email: str, asset_ids: list[int]):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == user_email).first()
        for asset_id in asset_ids:
            db.add(UserWatchlist(user_id=user.id, asset_id=asset_id))
        db.commit()
    finally:
        db.close()


def seed_notification_rule_data(user_email: str, symbols: dict[str, str]):
    asset_ids = {key: seed_asset(symbol) for key, symbol in symbols.items()}
    seed_watchlist(user_email, list(asset_ids.values()))
    db = SessionLocal()
    try:
        trade_date = date(2099, 7, 1)
        buy_asset_id = asset_ids["buy"]
        db.add(
            SwingTradeSetup(
                asset_id=buy_asset_id,
                trade_date=trade_date,
                current_price=100,
                entry_zone_low=95,
                entry_zone_high=100,
                add_zone_1=90,
                add_zone_2=85,
                stop_loss_price=80,
                target_price_1=120,
                target_price_2=130,
                expected_holding_days=45,
                swing_score=90,
                confidence_level="high",
                setup_type="pullback",
                reason="High confidence buy setup",
            )
        )
        db.add(
            TradePlan(
                asset_id=buy_asset_id,
                trade_date=trade_date,
                final_score=90,
                rating="strong_buy",
                action="buy",
                current_price=100,
                entry_price=100,
                stop_loss_price=80,
                take_profit_1=120,
                take_profit_2=130,
                expected_return_percent=20,
                max_loss_percent=20,
                risk_reward_ratio=1,
                strategy_type="pullback_buy",
                reason="Buy setup",
            )
        )

        tp_asset_id = asset_ids["take_profit"]
        db.add(
            SwingTradeSetup(
                asset_id=tp_asset_id,
                trade_date=trade_date,
                current_price=121,
                entry_zone_low=95,
                entry_zone_high=100,
                add_zone_1=90,
                add_zone_2=85,
                stop_loss_price=80,
                target_price_1=120,
                target_price_2=130,
                expected_holding_days=45,
                swing_score=80,
                confidence_level="medium",
                setup_type="pullback",
                reason="Take profit setup",
            )
        )
        db.add(
            AssetPrice(
                asset_id=tp_asset_id,
                trade_date=trade_date,
                open_price=120,
                high_price=122,
                low_price=119,
                close_price=121,
                volume=1000,
            )
        )

        sl_asset_id = asset_ids["stop_loss"]
        db.add(
            SwingTradeSetup(
                asset_id=sl_asset_id,
                trade_date=trade_date,
                current_price=79,
                entry_zone_low=95,
                entry_zone_high=100,
                add_zone_1=90,
                add_zone_2=85,
                stop_loss_price=80,
                target_price_1=120,
                target_price_2=130,
                expected_holding_days=45,
                swing_score=70,
                confidence_level="low",
                setup_type="pullback",
                reason="Stop loss setup",
            )
        )
        db.add(
            AssetPrice(
                asset_id=sl_asset_id,
                trade_date=trade_date,
                open_price=80,
                high_price=82,
                low_price=78,
                close_price=79,
                volume=1000,
            )
        )

        score_asset_id = asset_ids["score"]
        db.add_all(
            [
                AssetScore(
                    asset_id=score_asset_id,
                    trade_date=date(2099, 6, 1),
                    market_score=50,
                    industry_score=50,
                    factor_score=50,
                    price_level_score=50,
                    final_score=50,
                    rating="watch",
                ),
                AssetScore(
                    asset_id=score_asset_id,
                    trade_date=trade_date,
                    market_score=80,
                    industry_score=80,
                    factor_score=80,
                    price_level_score=80,
                    final_score=80,
                    rating="strong_buy",
                ),
            ]
        )

        db.add(
            PaperPortfolio(
                user_id=db.query(User).filter(User.email == user_email).first().id,
                name="Notification Portfolio",
                initial_cash=10000,
                cash_balance=10000,
                total_market_value=0,
                total_equity=10000,
                realized_pnl=500,
                unrealized_pnl=200,
            )
        )
        db.flush()
        portfolio = (
            db.query(PaperPortfolio)
            .filter(PaperPortfolio.name == "Notification Portfolio")
            .order_by(PaperPortfolio.id.desc())
            .first()
        )
        db.add(
            PerformanceReport(
                portfolio_id=portfolio.id,
                report_year=2099,
                report_month=7,
                initial_equity=10000,
                ending_equity=10700,
                total_return_percent=7,
                realized_pnl=500,
                unrealized_pnl=200,
                total_trades=10,
                win_trades=7,
                lose_trades=3,
                win_rate=70,
                max_drawdown=5,
                best_asset_id=buy_asset_id,
                worst_asset_id=sl_asset_id,
            )
        )
        db.commit()
    finally:
        db.close()
    return asset_ids


def test_notification_engine_rules_reports_send_and_permissions():
    suffix = uuid4().hex[:8].upper()
    email = f"notify_{suffix}@example.com"
    other_email = f"notify_other_{suffix}@example.com"
    symbols = {
        "buy": f"NB{suffix}",
        "take_profit": f"NT{suffix}",
        "stop_loss": f"NS{suffix}",
        "score": f"NC{suffix}",
    }
    market_dates = (date(2099, 7, 1), date(2099, 7, 2))

    cleanup_user(email)
    cleanup_user(other_email)
    for symbol in symbols.values():
        cleanup_asset(symbol)
    cleanup_market_dates(*market_dates)

    try:
        headers = create_headers(email)
        other_headers = create_headers(other_email)

        settings_response = client.get("/notifications/settings", headers=headers)
        assert settings_response.status_code == 200
        assert settings_response.json()["email_enabled"] is True

        update_response = client.put(
            "/notifications/settings",
            headers=headers,
            json={"weekly_report_enabled": False, "timezone": "Asia/Taipei"},
        )
        assert update_response.status_code == 200
        assert update_response.json()["weekly_report_enabled"] is False

        client.put(
            "/notifications/settings",
            headers=headers,
            json={"weekly_report_enabled": True},
        )

        seed_notification_rule_data(email, symbols)
        db = SessionLocal()
        try:
            db.add(
                MarketSnapshot(
                    snapshot_date=market_dates[0],
                    nasdaq_change_percent=1,
                    sp500_change_percent=1,
                    twii_change_percent=1,
                    vix_value=18,
                    us10y_value=4,
                    market_score=90,
                    market_regime="bull",
                )
            )
            db.add(
                MarketSnapshot(
                    snapshot_date=market_dates[1],
                    nasdaq_change_percent=-1,
                    sp500_change_percent=-1,
                    twii_change_percent=-1,
                    vix_value=25,
                    us10y_value=5,
                    market_score=30,
                    market_regime="bear",
                )
            )
            db.commit()
        finally:
            db.close()

        check_response = client.post("/notifications/check", headers=headers)
        assert check_response.status_code == 200
        notification_types = {log["notification_type"] for log in check_response.json()}
        assert "buy_signal" in notification_types
        assert "take_profit" in notification_types
        assert "stop_loss" in notification_types
        assert "score_change" in notification_types
        assert "market_change" in notification_types

        weekly_response = client.post("/notifications/weekly-report", headers=headers)
        assert weekly_response.status_code == 200
        assert weekly_response.json()["notification_type"] == "weekly_report"

        monthly_response = client.post("/notifications/monthly-report", headers=headers)
        assert monthly_response.status_code == 200
        assert monthly_response.json()["notification_type"] == "monthly_report"

        logs_response = client.get("/notifications/logs", headers=headers)
        assert logs_response.status_code == 200
        logs = logs_response.json()
        assert len(logs) >= 7

        log_id = logs[0]["id"]
        forbidden_response = client.get(f"/notifications/logs/{log_id}", headers=other_headers)
        assert forbidden_response.status_code == 404

        send_response = client.post(f"/notifications/logs/{log_id}/send", headers=headers)
        assert send_response.status_code == 200
        assert send_response.json()["status"] == "sent"
        assert send_response.json()["sent_at"] is not None
    finally:
        cleanup_user(email)
        cleanup_user(other_email)
        for symbol in symbols.values():
            cleanup_asset(symbol)
        cleanup_market_dates(*market_dates)
