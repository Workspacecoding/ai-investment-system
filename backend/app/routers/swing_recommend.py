from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.swing_recommend_service import get_swing_recommendations

router = APIRouter(prefix="/swing-recommend", tags=["swing-recommend"])


@router.get("/recommendations")
def swing_recommendations(
    user_id: int | None = Query(None, description="Filter by user watchlist (optional)"),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    """
    Returns swing recommendation candidates filtered from:
    1. Assets in tracked industries (core / observation)
    2. Assets with in_swing_pool = True
    3. Assets in user watchlist (if user_id provided)

    Sorted by SwingScore desc. No full-market scan.
    """
    return get_swing_recommendations(db, user_id=user_id, limit=limit)
