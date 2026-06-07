from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.profit_allocation import (
    ProfitAllocationGenerateRequest,
    ProfitAllocationRecommendationResponse,
    ProfitAllocationResponse,
)
from app.services.profit_allocation_service import (
    generate_profit_allocation,
    get_latest_profit_allocation,
    list_profit_allocation_recommendations,
    list_profit_allocations,
)


router = APIRouter(prefix="/profit-allocations")


@router.post("/generate", response_model=ProfitAllocationResponse)
def post_generate_profit_allocation(
    allocation_create: ProfitAllocationGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return generate_profit_allocation(
        db,
        user_id=current_user.id,
        portfolio_id=allocation_create.portfolio_id,
        realized_profit=allocation_create.realized_profit,
    )


@router.get("", response_model=list[ProfitAllocationResponse])
def get_profit_allocations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_profit_allocations(db, current_user.id)


@router.get("/latest", response_model=ProfitAllocationResponse)
def get_profit_allocation_latest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_latest_profit_allocation(db, current_user.id)


@router.get(
    "/{allocation_id}/recommendations",
    response_model=list[ProfitAllocationRecommendationResponse],
)
def get_profit_allocation_recommendations(
    allocation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_profit_allocation_recommendations(db, current_user.id, allocation_id)
