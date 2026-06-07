from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.backtesting import (
    BacktestRunCreate,
    BacktestRunResponse,
    BacktestTradeResponse,
    FactorBacktestCreate,
    FactorBacktestResultResponse,
    FactorRankCreate,
)
from app.services.backtest_service import (
    get_backtest_run_or_404,
    list_backtest_runs,
    list_backtest_trades,
    list_factor_results,
    rank_factors,
    run_factor_backtest,
    run_strategy_backtest,
)


router = APIRouter(prefix="/backtests")


@router.post("/strategy", response_model=BacktestRunResponse)
def post_strategy_backtest(
    backtest_create: BacktestRunCreate,
    db: Session = Depends(get_db),
):
    return run_strategy_backtest(
        db,
        strategy_type=backtest_create.strategy_type,
        start_date=backtest_create.start_date,
        end_date=backtest_create.end_date,
        initial_capital=backtest_create.initial_capital,
        market=backtest_create.market,
        name=backtest_create.name,
    )


@router.get("", response_model=list[BacktestRunResponse])
def get_backtests(db: Session = Depends(get_db)):
    return list_backtest_runs(db)


@router.post("/factors", response_model=FactorBacktestResultResponse)
def post_factor_backtest(
    factor_create: FactorBacktestCreate,
    db: Session = Depends(get_db),
):
    return run_factor_backtest(
        db,
        factor_name=factor_create.factor_name,
        start_date=factor_create.start_date,
        end_date=factor_create.end_date,
        industry_id=factor_create.industry_id,
        market=factor_create.market,
    )


@router.post("/factors/rank", response_model=list[FactorBacktestResultResponse])
def post_factor_ranking(
    rank_create: FactorRankCreate,
    db: Session = Depends(get_db),
):
    return rank_factors(
        db,
        start_date=rank_create.start_date,
        end_date=rank_create.end_date,
        industry_id=rank_create.industry_id,
        market=rank_create.market,
    )


@router.get("/factors/results", response_model=list[FactorBacktestResultResponse])
def get_factor_results(db: Session = Depends(get_db)):
    return list_factor_results(db)


@router.get("/{backtest_run_id}", response_model=BacktestRunResponse)
def get_backtest(backtest_run_id: int, db: Session = Depends(get_db)):
    return get_backtest_run_or_404(db, backtest_run_id)


@router.get("/{backtest_run_id}/trades", response_model=list[BacktestTradeResponse])
def get_backtest_trades(backtest_run_id: int, db: Session = Depends(get_db)):
    return list_backtest_trades(db, backtest_run_id)
