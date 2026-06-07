from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.goal_strategy import (
    GoalStrategyRecommendationResponse,
    GoalStrategyResponse,
)
from app.services.goal_strategy_service import (
    generate_goal_strategy,
    get_latest_goal_strategy,
    list_goal_strategies,
    list_goal_strategy_recommendations,
)


router = APIRouter(prefix="/goal-strategies")


@router.post("/generate", response_model=GoalStrategyResponse)
def post_generate_goal_strategy(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return generate_goal_strategy(db, current_user.id)


@router.get("/latest", response_model=GoalStrategyResponse)
def get_goal_strategy_latest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_latest_goal_strategy(db, current_user.id)


@router.get("", response_model=list[GoalStrategyResponse])
def get_goal_strategies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_goal_strategies(db, current_user.id)


@router.get(
    "/{goal_strategy_id}/recommendations",
    response_model=list[GoalStrategyRecommendationResponse],
)
def get_goal_strategy_recommendations(
    goal_strategy_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_goal_strategy_recommendations(db, current_user.id, goal_strategy_id)
