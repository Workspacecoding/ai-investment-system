from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.paper_trading import (
    PaperOrderCreate,
    PaperOrderResponse,
    PaperPortfolioCreate,
    PaperPortfolioResponse,
    PaperPositionResponse,
    PaperTradeLogResponse,
)
from app.services.paper_trading_service import (
    buy_asset,
    create_portfolio,
    get_portfolio_or_404,
    get_user_portfolios,
    list_orders,
    list_positions,
    list_trade_logs,
    sell_asset,
    update_positions_market_value,
)


router = APIRouter()


@router.post("/paper-portfolios", response_model=PaperPortfolioResponse)
def post_paper_portfolio(
    portfolio_create: PaperPortfolioCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_portfolio(
        db,
        current_user.id,
        portfolio_create.initial_cash,
        portfolio_create.name,
    )


@router.get("/paper-portfolios", response_model=list[PaperPortfolioResponse])
def get_paper_portfolios(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_user_portfolios(db, current_user.id)


@router.get("/paper-portfolios/{portfolio_id}", response_model=PaperPortfolioResponse)
def get_paper_portfolio(
    portfolio_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_portfolio_or_404(db, portfolio_id, current_user.id)


@router.post("/paper-portfolios/{portfolio_id}/buy", response_model=PaperOrderResponse)
def post_paper_buy(
    portfolio_id: int,
    order_create: PaperOrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return buy_asset(
        db,
        portfolio_id,
        current_user.id,
        order_create.asset_id,
        order_create.quantity,
        order_create.price,
        order_create.trade_plan_id,
        order_create.order_type,
    )


@router.post("/paper-portfolios/{portfolio_id}/sell", response_model=PaperOrderResponse)
def post_paper_sell(
    portfolio_id: int,
    order_create: PaperOrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return sell_asset(
        db,
        portfolio_id,
        current_user.id,
        order_create.asset_id,
        order_create.quantity,
        order_create.price,
        order_create.order_type,
    )


@router.get("/paper-portfolios/{portfolio_id}/orders", response_model=list[PaperOrderResponse])
def get_paper_orders(
    portfolio_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_orders(db, portfolio_id, current_user.id)


@router.get(
    "/paper-portfolios/{portfolio_id}/positions",
    response_model=list[PaperPositionResponse],
)
def get_paper_positions(
    portfolio_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_positions(db, portfolio_id, current_user.id)


@router.post("/paper-portfolios/{portfolio_id}/positions/update", response_model=PaperPortfolioResponse)
def post_update_paper_positions(
    portfolio_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_positions_market_value(db, portfolio_id, current_user.id)


@router.get(
    "/paper-portfolios/{portfolio_id}/trade-logs",
    response_model=list[PaperTradeLogResponse],
)
def get_paper_trade_logs(
    portfolio_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_trade_logs(db, portfolio_id, current_user.id)
