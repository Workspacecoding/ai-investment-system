from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.trade_plans import TradePlanResponse
from app.services.trade_plan_service import (
    generate_trade_plan,
    get_latest_trade_plan,
    list_trade_plans,
    rank_trade_plans,
)


router = APIRouter()


@router.post("/assets/{asset_id}/trade-plan/generate", response_model=TradePlanResponse)
def post_generate_trade_plan(asset_id: int, db: Session = Depends(get_db)):
    return generate_trade_plan(db, asset_id)


@router.get("/assets/{asset_id}/trade-plan/latest", response_model=TradePlanResponse)
def get_asset_trade_plan_latest(asset_id: int, db: Session = Depends(get_db)):
    return get_latest_trade_plan(db, asset_id)


@router.get("/trade-plans", response_model=list[TradePlanResponse])
def get_trade_plans(db: Session = Depends(get_db)):
    return list_trade_plans(db)


@router.get("/trade-plans/ranking", response_model=list[TradePlanResponse])
def get_trade_plans_ranking(db: Session = Depends(get_db)):
    return rank_trade_plans(db)
