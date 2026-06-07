from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.scores import AssetScoreResponse
from app.services.score_service import (
    calculate_asset_score,
    calculate_ranking,
    get_latest_asset_score,
)


router = APIRouter(prefix="/assets")


@router.post("/{asset_id}/score/calculate", response_model=AssetScoreResponse)
def post_calculate_asset_score(asset_id: int, db: Session = Depends(get_db)):
    return calculate_asset_score(db, asset_id)


@router.get("/{asset_id}/score/latest", response_model=AssetScoreResponse)
def get_asset_score_latest(asset_id: int, db: Session = Depends(get_db)):
    return get_latest_asset_score(db, asset_id)


@router.get("/scores/ranking", response_model=list[AssetScoreResponse])
def get_asset_scores_ranking(db: Session = Depends(get_db)):
    return calculate_ranking(db)
