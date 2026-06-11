from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.asset import Asset, UserWatchlist
from app.models.asset_score import AssetScore
from app.models.daily_report import DailyReport, DailyReportItem
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


def generate_daily_report_email(db: Session, user_id: int):
    setting = get_or_create_notification_settings(db, user_id)
    if not setting.email_enabled:
        return None

    report = (
        db.query(DailyReport)
        .filter(DailyReport.user_id == user_id)
        .order_by(DailyReport.report_date.desc(), DailyReport.id.desc())
        .first()
    )

    items = (
        db.query(DailyReportItem)
        .filter(DailyReportItem.daily_report_id == report.id)
        .all()
        if report
        else []
    )

    buy_items = [item for item in items if item.action == "BUY"]
    buy_symbols = []
    for item in buy_items:
        asset = db.query(Asset).filter(Asset.id == item.asset_id).first()
        if asset:
            buy_symbols.append(f"- {asset.symbol} score={number(item.score):.1f}")

    portfolio = (
        db.query(PaperPortfolio)
        .filter(PaperPortfolio.user_id == user_id)
        .order_by(PaperPortfolio.created_at.desc(), PaperPortfolio.id.desc())
        .first()
    )
    portfolio_line = (
        f"Portfolio total_equity={number(portfolio.total_equity):.2f}, "
        f"unrealized_pnl={number(portfolio.unrealized_pnl):.2f}"
        if portfolio
        else "Portfolio 尚無資料"
    )

    goal = (
        db.query(GoalStrategy)
        .filter(GoalStrategy.user_id == user_id)
        .order_by(GoalStrategy.created_at.desc(), GoalStrategy.id.desc())
        .first()
    )
    goal_progress = (
        number(goal.current_capital) / number(goal.target_capital) * 100
        if goal and number(goal.target_capital) > 0
        else 0
    )

    watchlist_asset_ids = [
        row[0]
        for row in db.query(UserWatchlist.asset_id)
        .filter(UserWatchlist.user_id == user_id)
        .all()
    ]
    watchlist_lines = []
    for asset_id in watchlist_asset_ids[:5]:
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        score_obj = (
            db.query(AssetScore)
            .filter(AssetScore.asset_id == asset_id)
            .order_by(AssetScore.trade_date.desc())
            .first()
        )
        if asset:
            score_val = number(score_obj.final_score) if score_obj else 0
            watchlist_lines.append(f"- {asset.symbol} final_score={score_val:.1f}")

    body_lines = ["今日投資日報", ""]
    if report:
        body_lines += [
            f"市場狀態：{report.market_state or '-'}",
            f"市場分數：{number(report.market_score):.1f}" if report.market_score else "市場分數：-",
            f"最佳產業：{report.top_industry or '-'}",
            "",
        ]
    body_lines += [
        "今日推薦（BUY）：",
        *(buy_symbols or ["- 尚無資料"]),
        "",
        "Watchlist 狀態（前 5 名）：",
        *(watchlist_lines or ["- 尚無資料"]),
        "",
        "Portfolio 狀態：",
        portfolio_line,
        "",
        f"Goal Progress：{goal_progress:.2f}%",
    ]

    return create_notification_log(
        db,
        user_id=user_id,
        notification_type="daily_report",
        subject="今日投資日報",
        body="\n".join(body_lines),
    )
