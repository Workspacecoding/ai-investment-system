from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.goals import UserGoalCreate, UserGoalResponse, UserGoalUpdate
from app.services.goals import (
    create_user_goal,
    delete_user_goal,
    list_user_goals,
    update_user_goal,
)


router = APIRouter()


@router.get("/goals", response_model=list[UserGoalResponse])
def get_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_user_goals(db, current_user.id)


@router.post("/goals", response_model=UserGoalResponse, status_code=status.HTTP_201_CREATED)
def post_goal(
    goal_create: UserGoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_user_goal(db, current_user.id, goal_create)


@router.put("/goals/{goal_id}", response_model=UserGoalResponse)
def put_goal(
    goal_id: int,
    goal_update: UserGoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_user_goal(db, current_user.id, goal_id, goal_update)


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_user_goal(db, current_user.id, goal_id)
