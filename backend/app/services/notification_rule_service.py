from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.asset import Asset, UserWatchlist
from app.models.asset_score import AssetScore
from app.models.market import MarketSnapshot
from app.models.price import AssetPrice
from app.models.swing_trade import SwingTradeSetup
from app.models.trade_plan import TradePlan
from app.services.notification_service import (
    create_notification_log,
    get_or_create_notification_settings,
)


def money(value) -> Decimal:
    return Decimal(str(value or 0))


def watchlist_assets(db: Session, user_id: int) -> list[Asset]:
    return (
        db.query(Asset)
        .join(UserWatchlist, UserWatchlist.asset_id == Asset.id)
        .filter(UserWatchlist.user_id == user_id)
        .all()
    )


def latest_swing_setup(db: Session, asset_id: int) -> SwingTradeSetup | None:
    return (
        db.query(SwingTradeSetup)
        .filter(SwingTradeSetup.asset_id == asset_id)
        .order_by(SwingTradeSetup.trade_date.desc(), SwingTradeSetup.id.desc())
        .first()
    )


def latest_trade_plan(db: Session, asset_id: int) -> TradePlan | None:
    return (
        db.query(TradePlan)
        .filter(TradePlan.asset_id == asset_id)
        .order_by(TradePlan.trade_date.desc(), TradePlan.id.desc())
        .first()
    )


def latest_price(db: Session, asset_id: int) -> AssetPrice | None:
    return (
        db.query(AssetPrice)
        .filter(AssetPrice.asset_id == asset_id)
        .order_by(AssetPrice.trade_date.desc(), AssetPrice.id.desc())
        .first()
    )


def latest_two_scores(db: Session, asset_id: int) -> list[AssetScore]:
    return (
        db.query(AssetScore)
        .filter(AssetScore.asset_id == asset_id)
        .order_by(AssetScore.trade_date.desc(), AssetScore.id.desc())
        .limit(2)
        .all()
    )


def check_buy_signal(db: Session, user_id: int):
    setting = get_or_create_notification_settings(db, user_id)
    if not setting.email_enabled or not setting.buy_signal_enabled:
        return []

    logs = []
    for asset in watchlist_assets(db, user_id):
        swing = latest_swing_setup(db, asset.id)
        trade_plan = latest_trade_plan(db, asset.id)
        if swing and trade_plan and swing.confidence_level == "high" and trade_plan.action == "buy":
            logs.append(
                create_notification_log(
                    db,
                    user_id=user_id,
                    asset_id=asset.id,
                    notification_type="buy_signal",
                    subject=f"{asset.symbol} 買點通知",
                    body=f"{asset.symbol} 進入買點區間，建議關注 Entry Zone。",
                )
            )
    return logs


def check_take_profit(db: Session, user_id: int):
    setting = get_or_create_notification_settings(db, user_id)
    if not setting.email_enabled or not setting.take_profit_enabled:
        return []

    logs = []
    for asset in watchlist_assets(db, user_id):
        price = latest_price(db, asset.id)
        swing = latest_swing_setup(db, asset.id)
        if price and swing and money(price.close_price) >= money(swing.target_price_1):
            logs.append(
                create_notification_log(
                    db,
                    user_id=user_id,
                    asset_id=asset.id,
                    notification_type="take_profit",
                    subject=f"{asset.symbol} 停利通知",
                    body=f"{asset.symbol} 已達第一目標價 TP1。",
                )
            )
    return logs


def check_stop_loss(db: Session, user_id: int):
    setting = get_or_create_notification_settings(db, user_id)
    if not setting.email_enabled or not setting.stop_loss_enabled:
        return []

    logs = []
    for asset in watchlist_assets(db, user_id):
        price = latest_price(db, asset.id)
        swing = latest_swing_setup(db, asset.id)
        if price and swing and money(price.close_price) <= money(swing.stop_loss_price):
            logs.append(
                create_notification_log(
                    db,
                    user_id=user_id,
                    asset_id=asset.id,
                    notification_type="stop_loss",
                    subject=f"{asset.symbol} 停損通知",
                    body=f"{asset.symbol} 已跌破停損價。",
                )
            )
    return logs


def check_score_change(db: Session, user_id: int):
    setting = get_or_create_notification_settings(db, user_id)
    if not setting.email_enabled or not setting.score_change_enabled:
        return []

    logs = []
    for asset in watchlist_assets(db, user_id):
        scores = latest_two_scores(db, asset.id)
        if len(scores) < 2:
            continue
        if abs(money(scores[0].final_score) - money(scores[1].final_score)) >= Decimal("15"):
            logs.append(
                create_notification_log(
                    db,
                    user_id=user_id,
                    asset_id=asset.id,
                    notification_type="score_change",
                    subject=f"{asset.symbol} 評分異動通知",
                    body=f"{asset.symbol} 評分出現明顯變化。",
                )
            )
    return logs


def check_market_change(db: Session, user_id: int):
    setting = get_or_create_notification_settings(db, user_id)
    if not setting.email_enabled or not setting.market_change_enabled:
        return []

    snapshots = (
        db.query(MarketSnapshot)
        .order_by(MarketSnapshot.snapshot_date.desc(), MarketSnapshot.id.desc())
        .limit(2)
        .all()
    )
    if len(snapshots) < 2 or snapshots[0].market_regime == snapshots[1].market_regime:
        return []

    return [
        create_notification_log(
            db,
            user_id=user_id,
            notification_type="market_change",
            subject="市場狀態異動通知",
            body=f"市場狀態由 {snapshots[1].market_regime} 轉為 {snapshots[0].market_regime}。",
        )
    ]


def check_all_notification_rules(db: Session, user_id: int):
    logs = []
    logs.extend(check_buy_signal(db, user_id))
    logs.extend(check_take_profit(db, user_id))
    logs.extend(check_stop_loss(db, user_id))
    logs.extend(check_score_change(db, user_id))
    logs.extend(check_market_change(db, user_id))
    return logs
