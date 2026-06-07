from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.backtest import BacktestRun, BacktestTrade, FactorBacktestResult
from app.models.factor import FactorScore
from app.models.price import AssetPrice
from app.models.trade_plan import TradePlan


def to_decimal(value: float | int | Decimal | None) -> Decimal:
    if value is None:
        return Decimal("0.0000")
    return Decimal(str(round(float(value), 4))).quantize(Decimal("0.0001"))


def validate_date_range(start_date: date, end_date: date):
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_date must be after start_date",
        )


def calculate_max_drawdown_from_pnls(initial_capital: Decimal, pnls: list[Decimal]) -> Decimal:
    peak = initial_capital
    equity = initial_capital
    max_drawdown = Decimal("0")
    for pnl in pnls:
        equity += pnl
        if equity > peak:
            peak = equity
        if peak:
            drawdown = ((peak - equity) / peak) * 100
            if drawdown > max_drawdown:
                max_drawdown = drawdown
    return to_decimal(max_drawdown)


def calculate_backtest_metrics(
    initial_capital: Decimal,
    trades: list[dict],
) -> dict:
    total_pnl = sum((trade["pnl"] for trade in trades), Decimal("0"))
    final_capital = initial_capital + total_pnl
    wins = [trade for trade in trades if trade["pnl"] > 0]
    losses = [trade for trade in trades if trade["pnl"] < 0]
    gross_profit = sum((trade["pnl"] for trade in wins), Decimal("0"))
    gross_loss = abs(sum((trade["pnl"] for trade in losses), Decimal("0")))
    total_trades = len(trades)
    win_rate = (len(wins) / total_trades * 100) if total_trades else 0
    profit_factor = (gross_profit / gross_loss) if gross_loss else gross_profit
    total_return = (
        ((final_capital - initial_capital) / initial_capital) * 100
        if initial_capital
        else Decimal("0")
    )
    ordered_pnls = [trade["pnl"] for trade in sorted(trades, key=lambda item: item["exit_date"])]
    return {
        "final_capital": to_decimal(final_capital),
        "total_return_percent": to_decimal(total_return),
        "max_drawdown": calculate_max_drawdown_from_pnls(initial_capital, ordered_pnls),
        "win_rate": to_decimal(win_rate),
        "total_trades": total_trades,
        "profit_factor": to_decimal(profit_factor),
    }


def get_prices_for_trade(
    db: Session,
    asset_id: int,
    start_date: date,
    end_date: date,
) -> list[AssetPrice]:
    return (
        db.query(AssetPrice)
        .filter(
            AssetPrice.asset_id == asset_id,
            AssetPrice.trade_date >= start_date,
            AssetPrice.trade_date <= end_date,
        )
        .order_by(AssetPrice.trade_date.asc())
        .all()
    )


def simulate_trade(
    db: Session,
    plan: TradePlan,
    end_date: date,
    capital_per_trade: Decimal,
) -> dict | None:
    prices = get_prices_for_trade(db, plan.asset_id, plan.trade_date, end_date)
    if not prices:
        return None

    entry_price = to_decimal(plan.entry_price or plan.current_price)
    stop_loss_price = to_decimal(plan.stop_loss_price)
    take_profit_1 = to_decimal(plan.take_profit_1)
    exit_price = to_decimal(prices[-1].close_price)
    exit_date = prices[-1].trade_date

    for price in prices:
        if to_decimal(price.low_price) <= stop_loss_price:
            exit_price = stop_loss_price
            exit_date = price.trade_date
            break
        if to_decimal(price.high_price) >= take_profit_1:
            exit_price = take_profit_1
            exit_date = price.trade_date
            break

    if entry_price <= 0:
        return None

    quantity = capital_per_trade / entry_price
    pnl = (exit_price - entry_price) * quantity
    pnl_percent = ((exit_price - entry_price) / entry_price) * 100
    return {
        "asset_id": plan.asset_id,
        "strategy_type": plan.strategy_type,
        "entry_date": plan.trade_date,
        "exit_date": exit_date,
        "entry_price": to_decimal(entry_price),
        "exit_price": to_decimal(exit_price),
        "quantity": to_decimal(quantity),
        "pnl": to_decimal(pnl),
        "pnl_percent": to_decimal(pnl_percent),
        "holding_days": (exit_date - plan.trade_date).days,
    }


def run_strategy_backtest(
    db: Session,
    strategy_type: str,
    start_date: date,
    end_date: date,
    initial_capital: float,
    market: str | None = None,
    name: str = "Strategy Backtest",
) -> BacktestRun:
    validate_date_range(start_date, end_date)
    query = (
        db.query(TradePlan)
        .join(Asset, Asset.id == TradePlan.asset_id)
        .filter(
            TradePlan.strategy_type == strategy_type,
            TradePlan.action == "buy",
            TradePlan.trade_date >= start_date,
            TradePlan.trade_date <= end_date,
        )
        .order_by(TradePlan.trade_date.asc(), TradePlan.id.asc())
    )
    if market:
        query = query.filter(Asset.market == market)

    plans = query.all()
    capital = to_decimal(initial_capital)
    capital_per_trade = capital / len(plans) if plans else Decimal("0")
    simulated_trades = [
        trade
        for plan in plans
        if (trade := simulate_trade(db, plan, end_date, capital_per_trade)) is not None
    ]
    metrics = calculate_backtest_metrics(capital, simulated_trades)
    run = BacktestRun(
        name=name,
        start_date=start_date,
        end_date=end_date,
        market=market,
        strategy_type=strategy_type,
        initial_capital=capital,
        **metrics,
    )
    db.add(run)
    db.flush()

    for trade in simulated_trades:
        db.add(BacktestTrade(backtest_run_id=run.id, **trade))

    db.commit()
    db.refresh(run)
    return run


def list_backtest_runs(db: Session) -> list[BacktestRun]:
    return db.query(BacktestRun).order_by(BacktestRun.created_at.desc(), BacktestRun.id.desc()).all()


def get_backtest_run_or_404(db: Session, backtest_run_id: int) -> BacktestRun:
    run = db.query(BacktestRun).filter(BacktestRun.id == backtest_run_id).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest run not found",
        )
    return run


def list_backtest_trades(db: Session, backtest_run_id: int) -> list[BacktestTrade]:
    get_backtest_run_or_404(db, backtest_run_id)
    return (
        db.query(BacktestTrade)
        .filter(BacktestTrade.backtest_run_id == backtest_run_id)
        .order_by(BacktestTrade.entry_date.asc(), BacktestTrade.id.asc())
        .all()
    )


def calculate_return_drawdown(returns: list[Decimal]) -> Decimal:
    peak = Decimal("0")
    cumulative = Decimal("0")
    max_drawdown = Decimal("0")
    for item_return in returns:
        cumulative += item_return
        if cumulative > peak:
            peak = cumulative
        drawdown = peak - cumulative
        if drawdown > max_drawdown:
            max_drawdown = drawdown
    return to_decimal(max_drawdown)


def calculate_factor_metrics(returns: list[Decimal]) -> dict:
    wins = [item for item in returns if item > 0]
    losses = [item for item in returns if item < 0]
    total_signals = len(returns)
    win_rate = (len(wins) / total_signals * 100) if total_signals else 0
    avg_return = (sum(returns, Decimal("0")) / total_signals) if total_signals else Decimal("0")
    gross_profit = sum(wins, Decimal("0"))
    gross_loss = abs(sum(losses, Decimal("0")))
    profit_factor = (gross_profit / gross_loss) if gross_loss else gross_profit
    return {
        "total_signals": total_signals,
        "win_rate": to_decimal(win_rate),
        "avg_return_percent": to_decimal(avg_return),
        "max_drawdown": calculate_return_drawdown(returns),
        "profit_factor": to_decimal(profit_factor),
    }


def run_factor_backtest(
    db: Session,
    factor_name: str,
    start_date: date,
    end_date: date,
    industry_id: int | None = None,
    market: str | None = None,
) -> FactorBacktestResult:
    validate_date_range(start_date, end_date)
    query = (
        db.query(FactorScore)
        .join(Asset, Asset.id == FactorScore.asset_id)
        .filter(
            FactorScore.factor_name == factor_name,
            FactorScore.factor_score >= 70,
            FactorScore.trade_date >= start_date,
            FactorScore.trade_date <= end_date,
        )
        .order_by(FactorScore.trade_date.asc(), FactorScore.id.asc())
    )
    if industry_id is not None:
        query = query.filter(Asset.industry_id == industry_id)
    if market:
        query = query.filter(Asset.market == market)

    signals = query.all()
    returns: list[Decimal] = []
    factor_type = "technical"
    for signal in signals:
        factor_type = signal.factor_type
        prices = get_prices_for_trade(db, signal.asset_id, signal.trade_date, end_date)
        if len(prices) < 2:
            continue
        entry_price = to_decimal(prices[0].close_price)
        exit_price = to_decimal(prices[5].close_price if len(prices) > 5 else prices[-1].close_price)
        if entry_price <= 0:
            continue
        returns.append(to_decimal(((exit_price - entry_price) / entry_price) * 100))

    result = FactorBacktestResult(
        factor_name=factor_name,
        factor_type=factor_type,
        industry_id=industry_id,
        market=market,
        start_date=start_date,
        end_date=end_date,
        factor_rank=None,
        **calculate_factor_metrics(returns),
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


def rank_factors(
    db: Session,
    start_date: date,
    end_date: date,
    industry_id: int | None = None,
    market: str | None = None,
) -> list[FactorBacktestResult]:
    validate_date_range(start_date, end_date)
    query = db.query(FactorBacktestResult).filter(
        FactorBacktestResult.start_date == start_date,
        FactorBacktestResult.end_date == end_date,
    )
    if industry_id is not None:
        query = query.filter(FactorBacktestResult.industry_id == industry_id)
    if market:
        query = query.filter(FactorBacktestResult.market == market)

    results = (
        query.order_by(
            FactorBacktestResult.profit_factor.desc(),
            FactorBacktestResult.win_rate.desc(),
            FactorBacktestResult.avg_return_percent.desc(),
            FactorBacktestResult.id.asc(),
        )
        .all()
    )
    for index, result in enumerate(results, start=1):
        result.factor_rank = index

    db.commit()
    for result in results:
        db.refresh(result)
    return results


def list_factor_results(db: Session) -> list[FactorBacktestResult]:
    return (
        db.query(FactorBacktestResult)
        .order_by(
            FactorBacktestResult.start_date.desc(),
            FactorBacktestResult.factor_rank.asc(),
            FactorBacktestResult.id.desc(),
        )
        .all()
    )
