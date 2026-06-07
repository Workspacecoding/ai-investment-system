from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.paper_trading import (
    PaperOrder,
    PaperPortfolio,
    PaperPosition,
    PaperTradeLog,
)
from app.models.price import AssetPrice
from app.models.trade_plan import TradePlan


def money(value: float | int | Decimal) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.0001"))


def create_portfolio(
    db: Session,
    user_id: int,
    initial_cash: float,
    name: str,
) -> PaperPortfolio:
    initial_cash_value = money(initial_cash)
    portfolio = PaperPortfolio(
        user_id=user_id,
        name=name,
        initial_cash=initial_cash_value,
        cash_balance=initial_cash_value,
        total_market_value=money(0),
        total_equity=initial_cash_value,
        realized_pnl=money(0),
        unrealized_pnl=money(0),
    )
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    return portfolio


def get_user_portfolios(db: Session, user_id: int) -> list[PaperPortfolio]:
    return (
        db.query(PaperPortfolio)
        .filter(PaperPortfolio.user_id == user_id)
        .order_by(PaperPortfolio.created_at.desc(), PaperPortfolio.id.desc())
        .all()
    )


def get_portfolio_or_404(
    db: Session,
    portfolio_id: int,
    user_id: int,
) -> PaperPortfolio:
    portfolio = (
        db.query(PaperPortfolio)
        .filter(PaperPortfolio.id == portfolio_id, PaperPortfolio.user_id == user_id)
        .first()
    )
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper portfolio not found",
        )
    return portfolio


def get_asset_or_404(db: Session, asset_id: int) -> Asset:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return asset


def recalculate_portfolio_totals(db: Session, portfolio: PaperPortfolio) -> PaperPortfolio:
    positions = (
        db.query(PaperPosition)
        .filter(PaperPosition.portfolio_id == portfolio.id)
        .all()
    )
    total_market_value = sum((position.market_value for position in positions), money(0))
    unrealized_pnl = sum((position.unrealized_pnl for position in positions), money(0))
    portfolio.total_market_value = money(total_market_value)
    portfolio.unrealized_pnl = money(unrealized_pnl)
    portfolio.total_equity = money(portfolio.cash_balance + portfolio.total_market_value)
    return portfolio


def buy_asset(
    db: Session,
    portfolio_id: int,
    user_id: int,
    asset_id: int,
    quantity: float,
    price: float,
    trade_plan_id: int | None = None,
    order_type: str = "market",
) -> PaperOrder:
    portfolio = get_portfolio_or_404(db, portfolio_id, user_id)
    get_asset_or_404(db, asset_id)
    quantity_value = money(quantity)
    price_value = money(price)
    amount = money(quantity_value * price_value)

    if portfolio.cash_balance < amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient cash balance",
        )

    order = PaperOrder(
        portfolio_id=portfolio.id,
        asset_id=asset_id,
        trade_plan_id=trade_plan_id,
        side="buy",
        order_type=order_type,
        price=price_value,
        quantity=quantity_value,
        amount=amount,
        status="filled",
    )
    db.add(order)

    position = (
        db.query(PaperPosition)
        .filter(PaperPosition.portfolio_id == portfolio.id, PaperPosition.asset_id == asset_id)
        .first()
    )
    if position:
        total_quantity = money(position.quantity + quantity_value)
        total_cost = money((position.quantity * position.avg_cost) + amount)
        position.quantity = total_quantity
        position.avg_cost = money(total_cost / total_quantity)
        position.current_price = price_value
    else:
        position = PaperPosition(
            portfolio_id=portfolio.id,
            asset_id=asset_id,
            quantity=quantity_value,
            avg_cost=price_value,
            current_price=price_value,
            market_value=amount,
            unrealized_pnl=money(0),
            unrealized_pnl_percent=money(0),
        )
        db.add(position)

    position.market_value = money(position.quantity * position.current_price)
    position.unrealized_pnl = money(position.market_value - (position.quantity * position.avg_cost))
    position.unrealized_pnl_percent = (
        money((position.unrealized_pnl / (position.quantity * position.avg_cost)) * 100)
        if position.quantity * position.avg_cost
        else money(0)
    )
    portfolio.cash_balance = money(portfolio.cash_balance - amount)
    recalculate_portfolio_totals(db, portfolio)

    db.commit()
    db.refresh(order)
    return order


def sell_asset(
    db: Session,
    portfolio_id: int,
    user_id: int,
    asset_id: int,
    quantity: float,
    price: float,
    order_type: str = "market",
) -> PaperOrder:
    portfolio = get_portfolio_or_404(db, portfolio_id, user_id)
    quantity_value = money(quantity)
    price_value = money(price)
    position = (
        db.query(PaperPosition)
        .filter(PaperPosition.portfolio_id == portfolio.id, PaperPosition.asset_id == asset_id)
        .first()
    )
    if not position:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")
    if position.quantity < quantity_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sell quantity exceeds position quantity",
        )

    amount = money(quantity_value * price_value)
    realized_pnl = money((price_value - position.avg_cost) * quantity_value)
    realized_pnl_percent = (
        money((realized_pnl / (position.avg_cost * quantity_value)) * 100)
        if position.avg_cost * quantity_value
        else money(0)
    )
    order = PaperOrder(
        portfolio_id=portfolio.id,
        asset_id=asset_id,
        side="sell",
        order_type=order_type,
        price=price_value,
        quantity=quantity_value,
        amount=amount,
        status="filled",
    )
    db.add(order)
    db.flush()

    trade_plan = (
        db.query(TradePlan)
        .filter(TradePlan.asset_id == asset_id)
        .order_by(TradePlan.trade_date.desc(), TradePlan.id.desc())
        .first()
    )
    db.add(
        PaperTradeLog(
            portfolio_id=portfolio.id,
            asset_id=asset_id,
            sell_order_id=order.id,
            realized_pnl=realized_pnl,
            realized_pnl_percent=realized_pnl_percent,
            holding_days=0,
            strategy_type=trade_plan.strategy_type if trade_plan else None,
        )
    )

    portfolio.cash_balance = money(portfolio.cash_balance + amount)
    portfolio.realized_pnl = money(portfolio.realized_pnl + realized_pnl)
    remaining_quantity = money(position.quantity - quantity_value)
    if remaining_quantity == 0:
        db.delete(position)
    else:
        position.quantity = remaining_quantity
        position.current_price = price_value
        position.market_value = money(position.quantity * position.current_price)
        position.unrealized_pnl = money(position.market_value - (position.quantity * position.avg_cost))
        position.unrealized_pnl_percent = (
            money((position.unrealized_pnl / (position.quantity * position.avg_cost)) * 100)
            if position.quantity * position.avg_cost
            else money(0)
        )

    recalculate_portfolio_totals(db, portfolio)
    db.commit()
    db.refresh(order)
    return order


def update_positions_market_value(
    db: Session,
    portfolio_id: int,
    user_id: int,
) -> PaperPortfolio:
    portfolio = get_portfolio_or_404(db, portfolio_id, user_id)
    positions = (
        db.query(PaperPosition)
        .filter(PaperPosition.portfolio_id == portfolio.id)
        .all()
    )
    for position in positions:
        latest_price = (
            db.query(AssetPrice)
            .filter(AssetPrice.asset_id == position.asset_id)
            .order_by(AssetPrice.trade_date.desc(), AssetPrice.id.desc())
            .first()
        )
        if not latest_price:
            continue
        position.current_price = money(latest_price.close_price)
        position.market_value = money(position.quantity * position.current_price)
        position.unrealized_pnl = money(position.market_value - (position.quantity * position.avg_cost))
        position.unrealized_pnl_percent = (
            money((position.unrealized_pnl / (position.quantity * position.avg_cost)) * 100)
            if position.quantity * position.avg_cost
            else money(0)
        )

    recalculate_portfolio_totals(db, portfolio)
    db.commit()
    db.refresh(portfolio)
    return portfolio


def list_orders(db: Session, portfolio_id: int, user_id: int) -> list[PaperOrder]:
    get_portfolio_or_404(db, portfolio_id, user_id)
    return (
        db.query(PaperOrder)
        .filter(PaperOrder.portfolio_id == portfolio_id)
        .order_by(PaperOrder.created_at.desc(), PaperOrder.id.desc())
        .all()
    )


def list_positions(db: Session, portfolio_id: int, user_id: int) -> list[PaperPosition]:
    get_portfolio_or_404(db, portfolio_id, user_id)
    return (
        db.query(PaperPosition)
        .filter(PaperPosition.portfolio_id == portfolio_id)
        .order_by(PaperPosition.id.asc())
        .all()
    )


def list_trade_logs(db: Session, portfolio_id: int, user_id: int) -> list[PaperTradeLog]:
    get_portfolio_or_404(db, portfolio_id, user_id)
    return (
        db.query(PaperTradeLog)
        .filter(PaperTradeLog.portfolio_id == portfolio_id)
        .order_by(PaperTradeLog.created_at.desc(), PaperTradeLog.id.desc())
        .all()
    )
