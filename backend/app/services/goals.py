from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user_goal import UserGoal
from app.schemas.goals import UserGoalCreate, UserGoalUpdate


def list_user_goals(db: Session, user_id: int) -> list[UserGoal]:
    return db.query(UserGoal).filter(UserGoal.user_id == user_id).all()


def create_user_goal(
    db: Session,
    user_id: int,
    goal_create: UserGoalCreate,
) -> UserGoal:
    goal = UserGoal(user_id=user_id, **goal_create.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


def get_user_goal_or_404(db: Session, user_id: int, goal_id: int) -> UserGoal:
    goal = (
        db.query(UserGoal)
        .filter(UserGoal.id == goal_id, UserGoal.user_id == user_id)
        .first()
    )
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )
    return goal


def update_user_goal(
    db: Session,
    user_id: int,
    goal_id: int,
    goal_update: UserGoalUpdate,
) -> UserGoal:
    goal = get_user_goal_or_404(db, user_id, goal_id)
    for field, value in goal_update.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)

    db.commit()
    db.refresh(goal)
    return goal


def delete_user_goal(db: Session, user_id: int, goal_id: int) -> None:
    goal = get_user_goal_or_404(db, user_id, goal_id)
    db.delete(goal)
    db.commit()
