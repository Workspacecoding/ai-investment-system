from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.portfolio_optimization import (
    PortfolioOptimizationAssetResponse,
    PortfolioOptimizationResponse,
)
from app.services.portfolio_optimization_service import (
    generate_portfolio_optimization,
    get_latest_portfolio_optimization,
    get_optimization_or_404,
    list_portfolio_optimization_assets,
    list_portfolio_optimizations,
)


router = APIRouter(prefix="/portfolio-optimizations")


@router.post("/generate", response_model=PortfolioOptimizationResponse)
def post_generate_portfolio_optimization(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return generate_portfolio_optimization(db, current_user.id)


@router.get("", response_model=list[PortfolioOptimizationResponse])
def get_portfolio_optimizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_portfolio_optimizations(db, current_user.id)


@router.get("/latest", response_model=PortfolioOptimizationResponse)
def get_portfolio_optimization_latest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_latest_portfolio_optimization(db, current_user.id)


@router.get("/{optimization_id}", response_model=PortfolioOptimizationResponse)
def get_portfolio_optimization(
    optimization_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_optimization_or_404(db, current_user.id, optimization_id)


@router.get("/{optimization_id}/assets", response_model=list[PortfolioOptimizationAssetResponse])
def get_portfolio_optimization_assets(
    optimization_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_portfolio_optimization_assets(db, current_user.id, optimization_id)
