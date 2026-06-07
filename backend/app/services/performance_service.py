from collections import defaultdict
from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.monthly_report import PerformanceReport, StrategyPerformance
from app.models.paper_trading import PaperPortfolio, PaperTradeLog
from app.services.paper_trading_service import get_portfolio_or_404


def money(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.0001"))


def percent(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.0001"))


def month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1)
    if month == 12:
        end = datetime(year + 1, 1, 1)
    else:
        end = datetime(year, month + 1, 1)
    return start, end


def calculate_max_drawdown(initial_equity: Decimal, trade_logs: list[PaperTradeLog]) -> Decimal:
    peak = initial_equity
    equity = initial_equity
    max_drawdown = Decimal("0")
    for log in sorted(trade_logs, key=lambda item: item.created_at):
        equity += money(log.realized_pnl)
        if equity > peak:
            peak = equity
        if peak:
            drawdown = ((peak - equity) / peak) * 100
            if drawdown > max_drawdown:
                max_drawdown = drawdown
    return percent(max_drawdown)


def upsert_strategy_performance(
    db: Session,
    portfolio_id: int,
    strategy_type: str,
    logs: list[PaperTradeLog],
) -> StrategyPerformance:
    total_trades = len(logs)
    wins = [log for log in logs if log.realized_pnl > 0]
    losses = [log for log in logs if log.realized_pnl < 0]
    win_rate = (len(wins) / total_trades * 100) if total_trades else 0
    avg_profit = (
        sum(float(log.realized_pnl_percent) for log in wins) / len(wins) if wins else 0
    )
    avg_loss = (
        sum(float(log.realized_pnl_percent) for log in losses) / len(losses)
        if losses
        else 0
    )
    net_return = sum(float(log.realized_pnl_percent) for log in logs)
    strategy = (
        db.query(StrategyPerformance)
        .filter(
            StrategyPerformance.portfolio_id == portfolio_id,
            StrategyPerformance.strategy_type == strategy_type,
        )
        .first()
    )
    data = {
        "total_trades": total_trades,
        "win_rate": percent(win_rate),
        "avg_profit_percent": percent(avg_profit),
        "avg_loss_percent": percent(avg_loss),
        "net_return_percent": percent(net_return),
    }
    if strategy:
        for field, value in data.items():
            setattr(strategy, field, value)
    else:
        strategy = StrategyPerformance(
            portfolio_id=portfolio_id,
            strategy_type=strategy_type,
            **data,
        )
        db.add(strategy)
    return strategy


def generate_monthly_report(
    db: Session,
    portfolio_id: int,
    user_id: int,
    year: int,
    month: int,
) -> PerformanceReport:
    portfolio = get_portfolio_or_404(db, portfolio_id, user_id)
    start, end = month_bounds(year, month)
    trade_logs = (
        db.query(PaperTradeLog)
        .filter(
            PaperTradeLog.portfolio_id == portfolio_id,
            PaperTradeLog.created_at >= start,
            PaperTradeLog.created_at < end,
        )
        .order_by(PaperTradeLog.created_at.asc(), PaperTradeLog.id.asc())
        .all()
    )
    initial_equity = money(portfolio.initial_cash)
    ending_equity = money(portfolio.total_equity)
    realized_pnl = money(portfolio.realized_pnl)
    unrealized_pnl = money(portfolio.unrealized_pnl)
    total_return = (
        ((ending_equity - initial_equity) / initial_equity) * 100
        if initial_equity
        else Decimal("0")
    )
    total_trades = len(trade_logs)
    win_trades = len([log for log in trade_logs if log.realized_pnl > 0])
    lose_trades = len([log for log in trade_logs if log.realized_pnl < 0])
    win_rate = (win_trades / total_trades * 100) if total_trades else 0
    max_drawdown = calculate_max_drawdown(initial_equity, trade_logs)

    pnl_by_asset: dict[int, Decimal] = defaultdict(lambda: Decimal("0"))
    for log in trade_logs:
        pnl_by_asset[log.asset_id] += money(log.realized_pnl)
    best_asset_id = max(pnl_by_asset, key=pnl_by_asset.get) if pnl_by_asset else None
    worst_asset_id = min(pnl_by_asset, key=pnl_by_asset.get) if pnl_by_asset else None

    report = (
        db.query(PerformanceReport)
        .filter(
            PerformanceReport.portfolio_id == portfolio_id,
            PerformanceReport.report_year == year,
            PerformanceReport.report_month == month,
        )
        .first()
    )
    data = {
        "initial_equity": initial_equity,
        "ending_equity": ending_equity,
        "total_return_percent": percent(total_return),
        "realized_pnl": realized_pnl,
        "unrealized_pnl": unrealized_pnl,
        "total_trades": total_trades,
        "win_trades": win_trades,
        "lose_trades": lose_trades,
        "win_rate": percent(win_rate),
        "max_drawdown": max_drawdown,
        "best_asset_id": best_asset_id,
        "worst_asset_id": worst_asset_id,
    }
    if report:
        for field, value in data.items():
            setattr(report, field, value)
    else:
        report = PerformanceReport(
            portfolio_id=portfolio_id,
            report_year=year,
            report_month=month,
            **data,
        )
        db.add(report)

    logs_by_strategy: dict[str, list[PaperTradeLog]] = defaultdict(list)
    for log in trade_logs:
        logs_by_strategy[log.strategy_type or "unknown"].append(log)
    for strategy_type, logs in logs_by_strategy.items():
        upsert_strategy_performance(db, portfolio_id, strategy_type, logs)

    db.commit()
    db.refresh(report)
    return report


def list_reports(db: Session, portfolio_id: int, user_id: int) -> list[PerformanceReport]:
    get_portfolio_or_404(db, portfolio_id, user_id)
    return (
        db.query(PerformanceReport)
        .filter(PerformanceReport.portfolio_id == portfolio_id)
        .order_by(PerformanceReport.report_year.desc(), PerformanceReport.report_month.desc())
        .all()
    )


def get_latest_report(db: Session, portfolio_id: int, user_id: int) -> PerformanceReport:
    get_portfolio_or_404(db, portfolio_id, user_id)
    report = (
        db.query(PerformanceReport)
        .filter(PerformanceReport.portfolio_id == portfolio_id)
        .order_by(PerformanceReport.report_year.desc(), PerformanceReport.report_month.desc())
        .first()
    )
    if not report:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report


def list_strategy_performance(
    db: Session,
    portfolio_id: int,
    user_id: int,
) -> list[StrategyPerformance]:
    get_portfolio_or_404(db, portfolio_id, user_id)
    return (
        db.query(StrategyPerformance)
        .filter(StrategyPerformance.portfolio_id == portfolio_id)
        .order_by(StrategyPerformance.net_return_percent.desc())
        .all()
    )
