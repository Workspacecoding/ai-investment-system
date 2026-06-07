from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.swing_trade import SwingTradeSetupResponse
from app.services.swing_trade_service import (
    generate_swing_setup,
    get_latest_swing_setup,
    list_swing_setups,
    rank_swing_setups,
)


router = APIRouter()


@router.post("/assets/{asset_id}/swing-setup/generate", response_model=SwingTradeSetupResponse)
def post_generate_swing_setup(asset_id: int, db: Session = Depends(get_db)):
    return generate_swing_setup(db, asset_id)


@router.get("/assets/{asset_id}/swing-setup/latest", response_model=SwingTradeSetupResponse)
def get_swing_setup_latest(asset_id: int, db: Session = Depends(get_db)):
    return get_latest_swing_setup(db, asset_id)


@router.get("/swing-setups", response_model=list[SwingTradeSetupResponse])
def get_swing_setups(db: Session = Depends(get_db)):
    return list_swing_setups(db)


@router.get("/swing-setups/ranking", response_model=list[SwingTradeSetupResponse])
def get_swing_setup_ranking(db: Session = Depends(get_db)):
    return rank_swing_setups(db)
