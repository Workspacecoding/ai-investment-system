from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.strategy_wave import StrategyWave, StrategyWaveBacktest
from app.models.strategy_position import StrategyPosition, StrategyPositionValidation
from app.models.user import User

router = APIRouter(prefix="/admin/strategies", tags=["strategies"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class WaveCreate(BaseModel):
    asset_id: int
    asset_symbol: str
    strategy_name: str
    period_days: Optional[int] = None
    activation_price: Optional[float] = None
    buy_price: Optional[float] = None
    sell_price_1: Optional[float] = None
    sell_price_2: Optional[float] = None
    win_rate: Optional[float] = None
    avg_return_pct: Optional[float] = None
    status: str = "testing"
    notes: Optional[str] = None

class WaveUpdate(BaseModel):
    strategy_name: Optional[str] = None
    period_days: Optional[int] = None
    activation_price: Optional[float] = None
    buy_price: Optional[float] = None
    sell_price_1: Optional[float] = None
    sell_price_2: Optional[float] = None
    win_rate: Optional[float] = None
    avg_return_pct: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class WaveBacktestCreate(BaseModel):
    backtest_date: str
    analysis_model_id: Optional[int] = None
    analysis_model_name: Optional[str] = None
    validation_indicator_id: Optional[int] = None
    validation_indicator_name: Optional[str] = None
    model_score: Optional[float] = None
    validation_target: Optional[str] = None
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    growth_pct: Optional[float] = None
    holding_days: Optional[int] = None
    win_rate: Optional[float] = None
    avg_return_pct: Optional[float] = None
    max_drawdown_pct: Optional[float] = None
    fit_rate: Optional[float] = None
    notes: Optional[str] = None
    indicator_score: Optional[float] = None  # kept for compat

class PositionCreate(BaseModel):
    asset_id: int
    asset_symbol: str
    center_price: float
    current_price: Optional[float] = None
    method: Optional[str] = None
    strong_buy_pct: float = -15.0
    buy_pct: float = -10.0
    watch_pct: float = -5.0
    sell_1_pct: float = 10.0
    sell_2_pct: float = 20.0
    sell_3_pct: float = 30.0
    status: str = "active"
    notes: Optional[str] = None
    updated_date: Optional[str] = None

class PositionUpdate(BaseModel):
    center_price: Optional[float] = None
    current_price: Optional[float] = None
    method: Optional[str] = None
    strong_buy_pct: Optional[float] = None
    buy_pct: Optional[float] = None
    watch_pct: Optional[float] = None
    sell_1_pct: Optional[float] = None
    sell_2_pct: Optional[float] = None
    sell_3_pct: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    updated_date: Optional[str] = None

class PositionValidationCreate(BaseModel):
    validation_date: str
    analysis_model_id: Optional[int] = None
    analysis_model_name: Optional[str] = None
    validation_indicator_id: Optional[int] = None
    validation_indicator_name: Optional[str] = None
    model_score: Optional[float] = None
    buy_zone: Optional[str] = None
    buy_price: Optional[float] = None
    sell_zone: Optional[str] = None
    sell_price: Optional[float] = None
    holding_days: Optional[int] = None
    return_pct: Optional[float] = None
    fit_rate: Optional[float] = None
    notes: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _wave_dict(w: StrategyWave) -> dict:
    return {
        "id": w.id, "asset_id": w.asset_id, "asset_symbol": w.asset_symbol,
        "strategy_name": w.strategy_name, "period_days": w.period_days,
        "activation_price": float(w.activation_price) if w.activation_price else None,
        "buy_price": float(w.buy_price) if w.buy_price else None,
        "sell_price_1": float(w.sell_price_1) if w.sell_price_1 else None,
        "sell_price_2": float(w.sell_price_2) if w.sell_price_2 else None,
        "win_rate": w.win_rate, "avg_return_pct": w.avg_return_pct,
        "status": w.status, "notes": w.notes,
        "created_at": w.created_at.isoformat() if w.created_at else None,
        "updated_at": w.updated_at.isoformat() if w.updated_at else None,
    }

def _wb_dict(b: StrategyWaveBacktest) -> dict:
    return {
        "id": b.id, "wave_id": b.wave_id, "backtest_date": b.backtest_date,
        "analysis_model_id": b.analysis_model_id, "analysis_model_name": b.analysis_model_name,
        "validation_indicator_id": b.validation_indicator_id, "validation_indicator_name": b.validation_indicator_name,
        "model_score": b.model_score, "indicator_score": b.indicator_score,
        "validation_target": b.validation_target,
        "entry_price": float(b.entry_price) if b.entry_price is not None else None,
        "exit_price": float(b.exit_price) if b.exit_price is not None else None,
        "growth_pct": b.growth_pct, "holding_days": b.holding_days,
        "win_rate": b.win_rate, "avg_return_pct": b.avg_return_pct,
        "max_drawdown_pct": b.max_drawdown_pct, "fit_rate": b.fit_rate,
        "notes": b.notes,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }

def _pos_dict(p: StrategyPosition) -> dict:
    cp = float(p.center_price)
    def zone_price(pct: float) -> float:
        return round(cp * (1 + pct / 100), 2)
    return {
        "id": p.id, "asset_id": p.asset_id, "asset_symbol": p.asset_symbol,
        "center_price": cp,
        "current_price": float(p.current_price) if p.current_price else None,
        "method": p.method,
        "strong_buy_pct": p.strong_buy_pct, "buy_pct": p.buy_pct, "watch_pct": p.watch_pct,
        "sell_1_pct": p.sell_1_pct, "sell_2_pct": p.sell_2_pct, "sell_3_pct": p.sell_3_pct,
        "strong_buy_price": zone_price(p.strong_buy_pct),
        "buy_price": zone_price(p.buy_pct),
        "watch_price": zone_price(p.watch_pct),
        "sell_1_price": zone_price(p.sell_1_pct),
        "sell_2_price": zone_price(p.sell_2_pct),
        "sell_3_price": zone_price(p.sell_3_pct),
        "status": p.status, "notes": p.notes, "updated_date": p.updated_date,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }

def _pv_dict(v: StrategyPositionValidation) -> dict:
    return {
        "id": v.id, "position_id": v.position_id, "validation_date": v.validation_date,
        "analysis_model_id": v.analysis_model_id, "analysis_model_name": v.analysis_model_name,
        "validation_indicator_id": v.validation_indicator_id, "validation_indicator_name": v.validation_indicator_name,
        "model_score": v.model_score,
        "buy_zone": v.buy_zone, "buy_price": float(v.buy_price) if v.buy_price else None,
        "sell_zone": v.sell_zone, "sell_price": float(v.sell_price) if v.sell_price else None,
        "holding_days": v.holding_days, "return_pct": v.return_pct,
        "fit_rate": v.fit_rate, "notes": v.notes,
        "created_at": v.created_at.isoformat() if v.created_at else None,
    }


# ── Wave endpoints ────────────────────────────────────────────────────────────

@router.get("/waves")
def list_waves(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rows = db.query(StrategyWave).order_by(StrategyWave.created_at.desc()).all()
    return [_wave_dict(w) for w in rows]

@router.post("/waves", status_code=status.HTTP_201_CREATED)
def create_wave(body: WaveCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    w = StrategyWave(**body.model_dump())
    db.add(w); db.commit(); db.refresh(w)
    return _wave_dict(w)

@router.put("/waves/{wave_id}")
def update_wave(wave_id: int, body: WaveUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    w = db.query(StrategyWave).filter(StrategyWave.id == wave_id).first()
    if not w: raise HTTPException(status_code=404, detail="Wave not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(w, k, v)
    db.commit(); db.refresh(w)
    return _wave_dict(w)

@router.delete("/waves/{wave_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wave(wave_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    w = db.query(StrategyWave).filter(StrategyWave.id == wave_id).first()
    if not w: raise HTTPException(status_code=404, detail="Wave not found")
    has_bt = db.query(StrategyWaveBacktest).filter(StrategyWaveBacktest.wave_id == wave_id).first()
    if has_bt: raise HTTPException(status_code=400, detail="此波段策略已有回測資料，無法刪除")
    db.delete(w); db.commit()

@router.get("/waves/{wave_id}/backtest")
def list_wave_backtest(wave_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rows = db.query(StrategyWaveBacktest).filter(StrategyWaveBacktest.wave_id == wave_id).order_by(StrategyWaveBacktest.backtest_date.desc()).all()
    return [_wb_dict(b) for b in rows]

@router.post("/waves/{wave_id}/backtest", status_code=status.HTTP_201_CREATED)
def add_wave_backtest(wave_id: int, body: WaveBacktestCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    b = StrategyWaveBacktest(wave_id=wave_id, **body.model_dump())
    db.add(b); db.commit(); db.refresh(b)
    return _wb_dict(b)

@router.delete("/waves/backtest/{bt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wave_backtest(bt_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    b = db.query(StrategyWaveBacktest).filter(StrategyWaveBacktest.id == bt_id).first()
    if not b: raise HTTPException(status_code=404, detail="Backtest not found")
    db.delete(b); db.commit()


# ── Position endpoints ────────────────────────────────────────────────────────

@router.get("/positions")
def list_positions(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rows = db.query(StrategyPosition).order_by(StrategyPosition.created_at.desc()).all()
    return [_pos_dict(p) for p in rows]

@router.post("/positions", status_code=status.HTTP_201_CREATED)
def create_position(body: PositionCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    p = StrategyPosition(**body.model_dump())
    db.add(p); db.commit(); db.refresh(p)
    return _pos_dict(p)

@router.put("/positions/{pos_id}")
def update_position(pos_id: int, body: PositionUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    p = db.query(StrategyPosition).filter(StrategyPosition.id == pos_id).first()
    if not p: raise HTTPException(status_code=404, detail="Position not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit(); db.refresh(p)
    return _pos_dict(p)

@router.delete("/positions/{pos_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_position(pos_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    p = db.query(StrategyPosition).filter(StrategyPosition.id == pos_id).first()
    if not p: raise HTTPException(status_code=404, detail="Position not found")
    has_val = db.query(StrategyPositionValidation).filter(StrategyPositionValidation.position_id == pos_id).first()
    if has_val: raise HTTPException(status_code=400, detail="此檔位策略已有驗證資料，無法刪除")
    db.delete(p); db.commit()

@router.get("/positions/{pos_id}/validations")
def list_position_validations(pos_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rows = db.query(StrategyPositionValidation).filter(StrategyPositionValidation.position_id == pos_id).order_by(StrategyPositionValidation.validation_date.desc()).all()
    return [_pv_dict(v) for v in rows]

@router.post("/positions/{pos_id}/validations", status_code=status.HTTP_201_CREATED)
def add_position_validation(pos_id: int, body: PositionValidationCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    v = StrategyPositionValidation(position_id=pos_id, **body.model_dump())
    db.add(v); db.commit(); db.refresh(v)
    return _pv_dict(v)

@router.delete("/positions/validations/{val_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_position_validation(val_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    v = db.query(StrategyPositionValidation).filter(StrategyPositionValidation.id == val_id).first()
    if not v: raise HTTPException(status_code=404, detail="Validation not found")
    db.delete(v); db.commit()
