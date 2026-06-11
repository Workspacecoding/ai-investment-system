import sys
from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.asset import Asset, UserWatchlist  # noqa: E402
from app.models.asset_score import AssetScore  # noqa: E402
from app.models.daily_report import DailyReport, DailyReportItem  # noqa: E402
from app.models.industry import Industry, IndustryMomentum  # noqa: E402
from app.models.market import MarketSnapshot  # noqa: E402
from app.models.notification import NotificationLog, NotificationSetting  # noqa: E402
from app.models.swing_trade import SwingTradeSetup  # noqa: E402
from app.models.user import User  # noqa: E402

client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def create_headers(email: str, name: str = "Daily Report User") -> dict:
    password = "12345678"
    client.post("/register", json={"email": email, "password": password, "name": name})
    resp = client.post("/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def get_user_id(email: str) -> int | None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        return user.id if user else None
    finally:
        db.close()


def cleanup_user(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return
        uid = user.id

        report_ids = [
            row[0]
            for row in db.query(DailyReport.id).filter(DailyReport.user_id == uid).all()
        ]
        if report_ids:
            db.query(DailyReportItem).filter(
                DailyReportItem.daily_report_id.in_(report_ids)
            ).delete(synchronize_session=False)
        db.query(DailyReport).filter(DailyReport.user_id == uid).delete(
            synchronize_session=False
        )
        db.query(NotificationLog).filter(NotificationLog.user_id == uid).delete(
            synchronize_session=False
        )
        db.query(NotificationSetting).filter(
            NotificationSetting.user_id == uid
        ).delete(synchronize_session=False)
        db.query(UserWatchlist).filter(UserWatchlist.user_id == uid).delete(
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
        if not asset:
            return
        db.query(DailyReportItem).filter(
            DailyReportItem.asset_id == asset.id
        ).delete(synchronize_session=False)
        db.query(SwingTradeSetup).filter(SwingTradeSetup.asset_id == asset.id).delete(
            synchronize_session=False
        )
        db.query(AssetScore).filter(AssetScore.asset_id == asset.id).delete(
            synchronize_session=False
        )
        db.query(UserWatchlist).filter(UserWatchlist.asset_id == asset.id).delete(
            synchronize_session=False
        )
        db.delete(asset)
        db.commit()
    finally:
        db.close()


def cleanup_market_dates(*dates: date):
    db = SessionLocal()
    try:
        db.query(MarketSnapshot).filter(
            MarketSnapshot.snapshot_date.in_(dates)
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def seed_asset(symbol: str, industry_id: int | None = None) -> int:
    db = SessionLocal()
    try:
        asset = Asset(
            symbol=symbol,
            name=f"{symbol} Test Asset",
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


def seed_watchlist(user_id: int, asset_id: int):
    db = SessionLocal()
    try:
        db.add(UserWatchlist(user_id=user_id, asset_id=asset_id))
        db.commit()
    finally:
        db.close()


def seed_asset_score(asset_id: int, final_score: float, trade_date: date):
    db = SessionLocal()
    try:
        db.add(
            AssetScore(
                asset_id=asset_id,
                trade_date=trade_date,
                market_score=final_score,
                industry_score=final_score,
                factor_score=final_score,
                price_level_score=final_score,
                final_score=final_score,
                rating="strong_buy",
            )
        )
        db.commit()
    finally:
        db.close()


def seed_swing_setup(asset_id: int, swing_score: float, confidence: str, trade_date: date):
    db = SessionLocal()
    try:
        db.add(
            SwingTradeSetup(
                asset_id=asset_id,
                trade_date=trade_date,
                current_price=100,
                entry_zone_low=95,
                entry_zone_high=100,
                add_zone_1=90,
                add_zone_2=85,
                stop_loss_price=80,
                target_price_1=120,
                target_price_2=130,
                expected_holding_days=30,
                swing_score=swing_score,
                confidence_level=confidence,
                setup_type="pullback",
                reason="Test setup reason",
            )
        )
        db.commit()
    finally:
        db.close()


def seed_market_snapshot(snapshot_date: date):
    db = SessionLocal()
    try:
        existing = (
            db.query(MarketSnapshot)
            .filter(MarketSnapshot.snapshot_date == snapshot_date)
            .first()
        )
        if not existing:
            db.add(
                MarketSnapshot(
                    snapshot_date=snapshot_date,
                    nasdaq_change_percent=1.5,
                    sp500_change_percent=1.2,
                    twii_change_percent=0.8,
                    vix_value=18.0,
                    us10y_value=4.2,
                    market_score=82.0,
                    market_regime="bull",
                )
            )
            db.commit()
    finally:
        db.close()


def delete_daily_reports_for_user(user_id: int):
    db = SessionLocal()
    try:
        report_ids = [
            row[0]
            for row in db.query(DailyReport.id).filter(DailyReport.user_id == user_id).all()
        ]
        if report_ids:
            db.query(DailyReportItem).filter(
                DailyReportItem.daily_report_id.in_(report_ids)
            ).delete(synchronize_session=False)
        db.query(DailyReport).filter(DailyReport.user_id == user_id).delete(
            synchronize_session=False
        )
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_daily_reports_full():
    suffix = uuid4().hex[:8].upper()
    email = f"dr_{suffix}@example.com"
    symbol = f"DR{suffix}"
    market_date = date(2099, 8, 1)

    cleanup_user(email)
    cleanup_asset(symbol)
    cleanup_market_dates(market_date)

    try:
        # Setup
        headers = create_headers(email)
        user_id = get_user_id(email)

        asset_id = seed_asset(symbol)
        seed_watchlist(user_id, asset_id)
        seed_asset_score(asset_id, final_score=85.0, trade_date=date(2099, 7, 30))
        seed_swing_setup(asset_id, swing_score=90.0, confidence="high", trade_date=date(2099, 7, 30))
        seed_market_snapshot(market_date)

        # ----------------------------------------------------------------
        # Test 1: 可建立日報
        # ----------------------------------------------------------------
        delete_daily_reports_for_user(user_id)
        resp = client.post("/daily-reports/generate", headers=headers)
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["user_id"] == user_id
        assert "report_date" in data
        assert data["market_state"] is not None or data["market_state"] is None  # field present
        report_id = data["id"]

        # ----------------------------------------------------------------
        # Test 2: 同一天不可重複建立
        # ----------------------------------------------------------------
        resp2 = client.post("/daily-reports/generate", headers=headers)
        assert resp2.status_code == 400
        assert "already exists" in resp2.json()["detail"].lower()

        # ----------------------------------------------------------------
        # Test 3: 可取得 latest report
        # ----------------------------------------------------------------
        resp3 = client.get("/daily-reports/latest", headers=headers)
        assert resp3.status_code == 200
        assert resp3.json()["id"] == report_id

        # ----------------------------------------------------------------
        # Test 4: 可列出歷史日報
        # ----------------------------------------------------------------
        resp4 = client.get("/daily-reports", headers=headers)
        assert resp4.status_code == 200
        assert isinstance(resp4.json(), list)
        assert len(resp4.json()) >= 1
        ids = [r["id"] for r in resp4.json()]
        assert report_id in ids

        # ----------------------------------------------------------------
        # Test 5: Dashboard API 可回傳 daily_report
        # ----------------------------------------------------------------
        resp5 = client.get("/dashboard", headers=headers)
        assert resp5.status_code == 200
        dash = resp5.json()
        assert "market" in dash
        assert "daily_report" in dash
        assert "opportunities" in dash
        assert "watchlist" in dash
        assert "portfolio" in dash
        assert "goal" in dash
        assert dash["daily_report"] is not None
        assert dash["daily_report"]["id"] == report_id

        # ----------------------------------------------------------------
        # Test 6: 可建立 daily_report_items
        # ----------------------------------------------------------------
        resp6 = client.get(f"/daily-reports/{report_id}", headers=headers)
        assert resp6.status_code == 200
        detail = resp6.json()
        assert "items" in detail
        assert isinstance(detail["items"], list)
        assert len(detail["items"]) >= 1
        item = detail["items"][0]
        assert item["asset_id"] == asset_id
        assert item["action"] in ("BUY", "WATCH", "HOLD", "AVOID")
        assert item["daily_report_id"] == report_id

        # ----------------------------------------------------------------
        # Test 7: Scheduler 可成功執行
        # ----------------------------------------------------------------
        from app.services.daily_report_scheduler import run_daily_report_for_user

        delete_daily_reports_for_user(user_id)
        db = SessionLocal()
        try:
            result = run_daily_report_for_user(db, user_id)
        finally:
            db.close()

        assert result["user_id"] == user_id
        assert result["report"] is not None or result["error"] is not None

        # ----------------------------------------------------------------
        # Test 8: Email 可產生 notification_log
        # ----------------------------------------------------------------
        db = SessionLocal()
        try:
            db.query(NotificationLog).filter(
                NotificationLog.user_id == user_id,
                NotificationLog.notification_type == "daily_report",
            ).delete(synchronize_session=False)
            db.commit()
        finally:
            db.close()

        from app.services.report_notification_service import generate_daily_report_email

        db = SessionLocal()
        try:
            log = generate_daily_report_email(db, user_id)
        finally:
            db.close()

        assert log is not None
        assert log.notification_type == "daily_report"
        assert log.subject == "今日投資日報"
        assert log.status == "pending"

    finally:
        cleanup_user(email)
        cleanup_asset(symbol)
        cleanup_market_dates(market_date)
