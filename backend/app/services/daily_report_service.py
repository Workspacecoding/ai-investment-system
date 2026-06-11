from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.asset import Asset, UserWatchlist
from app.models.asset_score import AssetScore
from app.models.daily_report import DailyReport, DailyReportItem
from app.models.goal_strategy import GoalStrategy
from app.models.industry import Industry, IndustryMomentum
from app.models.market import MarketSnapshot
from app.models.paper_trading import PaperPortfolio
from app.models.swing_trade import SwingTradeSetup
from app.models.trade_plan import TradePlan


def _number(value) -> float:
    if value is None:
        return 0.0
    return float(Decimal(str(value)))


def _determine_action(final_score: float, confidence: str | None) -> str:
    if final_score >= 80 and confidence == "high":
        return "BUY"
    elif final_score >= 65:
        return "WATCH"
    elif final_score >= 50:
        return "HOLD"
    return "AVOID"


def _latest_market(db: Session) -> MarketSnapshot | None:
    return (
        db.query(MarketSnapshot)
        .order_by(MarketSnapshot.snapshot_date.desc(), MarketSnapshot.id.desc())
        .first()
    )


def _top_industry_name(db: Session) -> str | None:
    row = (
        db.query(Industry)
        .join(IndustryMomentum, IndustryMomentum.industry_id == Industry.id)
        .order_by(IndustryMomentum.momentum_score.desc(), IndustryMomentum.id.desc())
        .first()
    )
    return row.industry_name if row else None


def _top_swing_setups(db: Session, limit: int = 10) -> list[SwingTradeSetup]:
    return (
        db.query(SwingTradeSetup)
        .filter(SwingTradeSetup.confidence_level == "high")
        .order_by(SwingTradeSetup.swing_score.desc(), SwingTradeSetup.id.desc())
        .limit(limit)
        .all()
    )


def _latest_asset_score(db: Session, asset_id: int) -> AssetScore | None:
    return (
        db.query(AssetScore)
        .filter(AssetScore.asset_id == asset_id)
        .order_by(AssetScore.trade_date.desc(), AssetScore.id.desc())
        .first()
    )


def _latest_swing_setup(db: Session, asset_id: int) -> SwingTradeSetup | None:
    return (
        db.query(SwingTradeSetup)
        .filter(SwingTradeSetup.asset_id == asset_id)
        .order_by(SwingTradeSetup.trade_date.desc(), SwingTradeSetup.id.desc())
        .first()
    )


def _latest_trade_plan(db: Session, asset_id: int) -> TradePlan | None:
    return (
        db.query(TradePlan)
        .filter(TradePlan.asset_id == asset_id)
        .order_by(TradePlan.trade_date.desc(), TradePlan.id.desc())
        .first()
    )


def _build_summary(
    market_state: str | None,
    market_score: float | None,
    top_industry: str | None,
    rec_symbols: list[str],
) -> str:
    lines = [
        f"市場狀態：{market_state or '-'}",
        f"市場分數：{market_score if market_score is not None else '-'}",
        f"最佳產業：{top_industry or '-'}",
        "今日推薦：",
    ]
    lines += rec_symbols if rec_symbols else ["-"]
    return "\n".join(lines)


def generate_daily_report(db: Session, user_id: int) -> DailyReport:
    today = date.today()

    existing = (
        db.query(DailyReport)
        .filter(DailyReport.user_id == user_id, DailyReport.report_date == today)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Daily report already exists for today",
        )

    market = _latest_market(db)
    market_state = market.market_regime if market else None
    market_score_val = _number(market.market_score) if market else None
    top_industry = _top_industry_name(db)

    top_setups = _top_swing_setups(db, limit=10)

    rec_symbols: list[str] = []
    for setup in top_setups[:3]:
        asset = db.query(Asset).filter(Asset.id == setup.asset_id).first()
        if asset:
            rec_symbols.append(asset.symbol)

    summary = _build_summary(market_state, market_score_val, top_industry, rec_symbols)

    report = DailyReport(
        user_id=user_id,
        report_date=today,
        market_state=market_state,
        market_score=market_score_val,
        top_industry=top_industry,
        summary=summary,
    )
    db.add(report)
    db.flush()

    seen_asset_ids: set[int] = set()

    watchlist_items = (
        db.query(UserWatchlist)
        .filter(UserWatchlist.user_id == user_id)
        .all()
    )
    for wl in watchlist_items:
        asset_id = wl.asset_id
        seen_asset_ids.add(asset_id)

        score_row = _latest_asset_score(db, asset_id)
        swing_row = _latest_swing_setup(db, asset_id)
        trade_plan_row = _latest_trade_plan(db, asset_id)

        final_score = _number(score_row.final_score) if score_row else 0.0
        confidence = swing_row.confidence_level if swing_row else None
        action = _determine_action(final_score, confidence)

        reason = None
        if swing_row:
            reason = swing_row.reason
        elif trade_plan_row:
            reason = trade_plan_row.reason

        db.add(DailyReportItem(
            daily_report_id=report.id,
            asset_id=asset_id,
            action=action,
            score=final_score if score_row else None,
            swing_score=_number(swing_row.swing_score) if swing_row else None,
            confidence=confidence,
            reason=reason,
        ))

    for setup in top_setups:
        if setup.asset_id in seen_asset_ids:
            continue
        seen_asset_ids.add(setup.asset_id)

        score_row = _latest_asset_score(db, setup.asset_id)
        final_score = _number(score_row.final_score) if score_row else 0.0
        action = _determine_action(final_score, setup.confidence_level)

        db.add(DailyReportItem(
            daily_report_id=report.id,
            asset_id=setup.asset_id,
            action=action,
            score=final_score if score_row else None,
            swing_score=_number(setup.swing_score),
            confidence=setup.confidence_level,
            reason=setup.reason,
        ))

    db.commit()
    db.refresh(report)
    report.items = (
        db.query(DailyReportItem)
        .filter(DailyReportItem.daily_report_id == report.id)
        .all()
    )
    return report


def get_latest_daily_report(db: Session, user_id: int) -> DailyReport | None:
    report = (
        db.query(DailyReport)
        .filter(DailyReport.user_id == user_id)
        .order_by(DailyReport.report_date.desc(), DailyReport.id.desc())
        .first()
    )
    if report:
        report.items = (
            db.query(DailyReportItem)
            .filter(DailyReportItem.daily_report_id == report.id)
            .all()
        )
    return report


def get_daily_report(db: Session, report_id: int, user_id: int) -> DailyReport:
    report = (
        db.query(DailyReport)
        .filter(DailyReport.id == report_id, DailyReport.user_id == user_id)
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily report not found",
        )
    report.items = (
        db.query(DailyReportItem)
        .filter(DailyReportItem.daily_report_id == report.id)
        .all()
    )
    return report


def list_daily_reports(db: Session, user_id: int) -> list[DailyReport]:
    reports = (
        db.query(DailyReport)
        .filter(DailyReport.user_id == user_id)
        .order_by(DailyReport.report_date.desc(), DailyReport.id.desc())
        .all()
    )
    for report in reports:
        report.items = (
            db.query(DailyReportItem)
            .filter(DailyReportItem.daily_report_id == report.id)
            .all()
        )
    return reports


def get_dashboard_data(db: Session, user_id: int) -> dict:
    market = _latest_market(db)

    daily_report = get_latest_daily_report(db, user_id)

    top_setups = _top_swing_setups(db, limit=10)
    opportunities = []
    for setup in top_setups:
        asset = db.query(Asset).filter(Asset.id == setup.asset_id).first()
        if asset:
            opportunities.append({
                "asset_id": setup.asset_id,
                "symbol": asset.symbol,
                "swing_score": _number(setup.swing_score),
                "confidence": setup.confidence_level,
                "reason": setup.reason,
            })

    watchlist_items = (
        db.query(UserWatchlist)
        .filter(UserWatchlist.user_id == user_id)
        .all()
    )
    watchlist_summary = []
    for wl in watchlist_items:
        asset = db.query(Asset).filter(Asset.id == wl.asset_id).first()
        score_row = _latest_asset_score(db, wl.asset_id)
        swing_row = _latest_swing_setup(db, wl.asset_id)

        final_score = _number(score_row.final_score) if score_row else 0.0
        confidence = swing_row.confidence_level if swing_row else None
        action = _determine_action(final_score, confidence)

        watchlist_summary.append({
            "asset_id": wl.asset_id,
            "symbol": asset.symbol if asset else str(wl.asset_id),
            "final_score": final_score if score_row else None,
            "swing_score": _number(swing_row.swing_score) if swing_row else None,
            "action": action,
        })

    portfolio = (
        db.query(PaperPortfolio)
        .filter(PaperPortfolio.user_id == user_id)
        .order_by(PaperPortfolio.created_at.desc(), PaperPortfolio.id.desc())
        .first()
    )
    portfolio_data: dict = {}
    if portfolio:
        portfolio_data = {
            "id": portfolio.id,
            "name": portfolio.name,
            "total_equity": _number(portfolio.total_equity),
            "unrealized_pnl": _number(portfolio.unrealized_pnl),
            "cash_balance": _number(portfolio.cash_balance),
        }

    goal = (
        db.query(GoalStrategy)
        .filter(GoalStrategy.user_id == user_id)
        .order_by(GoalStrategy.created_at.desc(), GoalStrategy.id.desc())
        .first()
    )
    goal_data: dict = {}
    if goal:
        target = _number(goal.target_capital)
        current = _number(goal.current_capital)
        progress = (current / target * 100) if target > 0 else 0.0
        goal_data = {
            "id": goal.id,
            "current_capital": current,
            "target_capital": target,
            "required_annual_return": _number(goal.required_annual_return),
            "progress_percent": round(progress, 2),
        }

    market_data: dict = {}
    if market:
        market_data = {
            "snapshot_date": market.snapshot_date,
            "market_regime": market.market_regime,
            "market_score": _number(market.market_score),
            "nasdaq_change_percent": _number(market.nasdaq_change_percent),
            "sp500_change_percent": _number(market.sp500_change_percent),
        }

    return {
        "market": market_data,
        "daily_report": daily_report,
        "opportunities": opportunities,
        "watchlist": watchlist_summary,
        "portfolio": portfolio_data,
        "goal": goal_data,
    }
