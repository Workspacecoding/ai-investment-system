from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.asset import Asset, UserWatchlist
from app.models.asset_score import AssetScore
from app.models.goal_strategy import GoalStrategy
from app.models.monthly_report import PerformanceReport
from app.models.paper_trading import PaperPortfolio
from app.models.swing_trade import SwingTradeSetup
from app.services.notification_service import (
    create_notification_log,
    get_or_create_notification_settings,
)


def number(value) -> float:
    return float(Decimal(str(value or 0)))


def asset_symbol(db: Session, asset_id: int | None) -> str:
    if not asset_id:
        return "-"
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    return asset.symbol if asset else str(asset_id)


def latest_user_portfolio(db: Session, user_id: int) -> PaperPortfolio | None:
    return (
        db.query(PaperPortfolio)
        .filter(PaperPortfolio.user_id == user_id)
        .order_by(PaperPortfolio.created_at.desc(), PaperPortfolio.id.desc())
        .first()
    )


def top_swing_setups(db: Session, limit: int = 5) -> list[SwingTradeSetup]:
    return (
        db.query(SwingTradeSetup)
        .order_by(SwingTradeSetup.swing_score.desc(), SwingTradeSetup.id.asc())
        .limit(limit)
        .all()
    )


def top_watchlist_scores(db: Session, user_id: int, limit: int = 5) -> list[tuple[Asset, AssetScore]]:
    watchlist_asset_ids = (
        db.query(UserWatchlist.asset_id)
        .filter(UserWatchlist.user_id == user_id)
        .subquery()
    )
    rows = (
        db.query(Asset, AssetScore)
        .join(AssetScore, AssetScore.asset_id == Asset.id)
        .filter(Asset.id.in_(watchlist_asset_ids))
        .order_by(AssetScore.final_score.desc(), AssetScore.trade_date.desc())
        .limit(limit)
        .all()
    )
    return rows


def latest_performance_report(db: Session, portfolio_id: int) -> PerformanceReport | None:
    return (
        db.query(PerformanceReport)
        .filter(PerformanceReport.portfolio_id == portfolio_id)
        .order_by(
            PerformanceReport.report_year.desc(),
            PerformanceReport.report_month.desc(),
            PerformanceReport.id.desc(),
        )
        .first()
    )


def latest_goal_strategy(db: Session, user_id: int) -> GoalStrategy | None:
    return (
        db.query(GoalStrategy)
        .filter(GoalStrategy.user_id == user_id)
        .order_by(GoalStrategy.created_at.desc(), GoalStrategy.id.desc())
        .first()
    )


def generate_weekly_report_notification(db: Session, user_id: int):
    setting = get_or_create_notification_settings(db, user_id)
    if not setting.email_enabled or not setting.weekly_report_enabled:
        return None

    swing_lines = [
        f"- {asset_symbol(db, setup.asset_id)} swing_score={number(setup.swing_score):.1f}"
        for setup in top_swing_setups(db)
    ]
    score_lines = [
        f"- {asset.symbol} final_score={number(score.final_score):.1f}"
        for asset, score in top_watchlist_scores(db, user_id)
    ]
    portfolio = latest_user_portfolio(db, user_id)
    portfolio_line = (
        f"Portfolio total_equity={number(portfolio.total_equity):.2f}, "
        f"unrealized_pnl={number(portfolio.unrealized_pnl):.2f}"
        if portfolio
        else "Portfolio 尚無資料"
    )
    body = "\n".join(
        [
            "本週投資週報",
            "",
            "本週最佳 swing setup 前 5 名：",
            *(swing_lines or ["- 尚無資料"]),
            "",
            "Watchlist 評分最高前 5 名：",
            *(score_lines or ["- 尚無資料"]),
            "",
            "Portfolio 本週損益摘要：",
            portfolio_line,
        ]
    )
    return create_notification_log(
        db,
        user_id=user_id,
        notification_type="weekly_report",
        subject="本週投資週報",
        body=body,
    )


def generate_monthly_report_notification(db: Session, user_id: int):
    setting = get_or_create_notification_settings(db, user_id)
    if not setting.email_enabled or not setting.monthly_report_enabled:
        return None

    portfolio = latest_user_portfolio(db, user_id)
    report = latest_performance_report(db, portfolio.id) if portfolio else None
    goal = latest_goal_strategy(db, user_id)
    goal_progress = (
        number(goal.current_capital) / number(goal.target_capital) * 100
        if goal and number(goal.target_capital) > 0
        else 0
    )
    if report:
        body = "\n".join(
            [
                "本月投資月報",
                f"本月報酬率：{number(report.total_return_percent):.2f}%",
                f"realized_pnl：{number(report.realized_pnl):.2f}",
                f"unrealized_pnl：{number(report.unrealized_pnl):.2f}",
                f"win_rate：{number(report.win_rate):.2f}%",
                f"best_asset：{asset_symbol(db, report.best_asset_id)}",
                f"worst_asset：{asset_symbol(db, report.worst_asset_id)}",
                f"goal progress：{goal_progress:.2f}%",
            ]
        )
    else:
        body = "\n".join(
            [
                "本月投資月報",
                "尚無月報績效資料。",
                f"goal progress：{goal_progress:.2f}%",
            ]
        )
    return create_notification_log(
        db,
        user_id=user_id,
        notification_type="monthly_report",
        subject="本月投資月報",
        body=body,
    )
