from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.industry import Industry, IndustryMomentum
from app.models.market_config import MarketConfig as MarketConfigModel
from app.models.market_config_indicator_link import MarketConfigIndicatorLink
from app.models.market_indicator_config import MarketIndicatorConfig, TrackedIndustry
from app.schemas.market import MarketSnapshotCreate, MarketSnapshotResponse
from app.services.market_service import (
    get_latest_market_snapshot,
    list_market_snapshots,
    upsert_market_snapshot,
)


router = APIRouter(prefix="/market")


@router.post("/snapshots", response_model=MarketSnapshotResponse)
def post_market_snapshot(
    snapshot_create: MarketSnapshotCreate,
    db: Session = Depends(get_db),
):
    return upsert_market_snapshot(db, snapshot_create)


@router.get("/snapshots/latest", response_model=MarketSnapshotResponse)
def get_latest_snapshot(db: Session = Depends(get_db)):
    snapshot = get_latest_market_snapshot(db)
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Market snapshot not found",
        )
    return snapshot


@router.get("/snapshots", response_model=list[MarketSnapshotResponse])
def get_market_snapshots(db: Session = Depends(get_db)):
    return list_market_snapshots(db)


@router.get("/dashboard")
def get_market_dashboard(db: Session = Depends(get_db)):
    """Returns market score with per-indicator breakdown and tracked/top industries."""
    snapshot = get_latest_market_snapshot(db)

    # ── Indicator values ──────────────────────────────────────────────────────
    configs = (
        db.query(MarketIndicatorConfig)
        .filter(MarketIndicatorConfig.is_active.is_(True))
        .order_by(MarketIndicatorConfig.display_order.asc())
        .all()
    )
    snapshot_dict = {}
    if snapshot:
        snapshot_dict = {
            "twii_change_percent": float(snapshot.twii_change_percent or 0),
            "nasdaq_change_percent": float(snapshot.nasdaq_change_percent or 0),
            "sp500_change_percent": float(snapshot.sp500_change_percent or 0),
            "vix_value": float(snapshot.vix_value or 0),
            "us10y_value": float(snapshot.us10y_value or 0),
            "market_score": float(snapshot.market_score or 0),
        }

    def _recommend(score: float) -> str:
        if score >= 75:
            return "積極做多"
        if score >= 60:
            return "多頭操作"
        if score >= 45:
            return "中性觀望"
        if score >= 30:
            return "謹慎防守"
        return "保守現金"

    indicators = []
    for cfg in configs:
        value = snapshot_dict.get(cfg.field_key)
        indicators.append({
            "id": cfg.id,
            "field_key": cfg.field_key,
            "display_name": cfg.display_name,
            "unit": cfg.unit,
            "value": value,
            "formula": cfg.formula,
            "description": cfg.description,
        })

    market_score = snapshot_dict.get("market_score", 0)
    market_regime = snapshot.market_regime if snapshot else "sideways"

    # ── Top 3 industries by momentum ─────────────────────────────────────────
    top_momentums = (
        db.query(IndustryMomentum, Industry)
        .join(Industry, Industry.id == IndustryMomentum.industry_id)
        .order_by(IndustryMomentum.snapshot_date.desc(), IndustryMomentum.momentum_score.desc())
        .limit(3)
        .all()
    )
    top_industries = [
        {
            "industry_id": ind.id,
            "industry_name": ind.industry_name,
            "industry_code": ind.industry_code,
            "momentum_score": float(mom.momentum_score or 0),
            "ranking": mom.ranking,
        }
        for mom, ind in top_momentums
    ]

    # ── Tracked industries ────────────────────────────────────────────────────
    tracked_rows = (
        db.query(TrackedIndustry, Industry)
        .join(Industry, Industry.id == TrackedIndustry.industry_id)
        .all()
    )
    tracked_ids = {ind.id for _, ind in tracked_rows}

    tracked_industries = []
    for ti, ind in tracked_rows:
        latest_mom = (
            db.query(IndustryMomentum)
            .filter(IndustryMomentum.industry_id == ind.id)
            .order_by(IndustryMomentum.snapshot_date.desc(), IndustryMomentum.id.desc())
            .first()
        )
        tracked_industries.append({
            "industry_id": ind.id,
            "industry_name": ind.industry_name,
            "industry_code": ind.industry_code,
            "momentum_score": float(latest_mom.momentum_score) if latest_mom else None,
            "ranking": latest_mom.ranking if latest_mom else None,
        })

    # ── Tracked markets (is_tracked=True) with dynamic indicator links ────────
    tracked_market_rows = (
        db.query(MarketConfigModel)
        .filter(MarketConfigModel.is_tracked.is_(True), MarketConfigModel.is_active.is_(True))
        .order_by(MarketConfigModel.display_order.asc(), MarketConfigModel.code.asc())
        .all()
    )
    cfg_map = {c.field_key: c for c in configs}

    tracked_markets = []
    for m in tracked_market_rows:
        # Fetch linked indicators for this market from DB
        linked_rows = (
            db.query(MarketConfigIndicatorLink, MarketIndicatorConfig)
            .join(MarketIndicatorConfig, MarketIndicatorConfig.id == MarketConfigIndicatorLink.indicator_config_id)
            .filter(MarketConfigIndicatorLink.market_config_id == m.id)
            .all()
        )
        mkt_indicators = []
        for _, cfg in linked_rows:
            mkt_indicators.append({
                "field_key": cfg.field_key,
                "display_name": cfg.display_name,
                "value": snapshot_dict.get(cfg.field_key),
                "unit": cfg.unit,
            })
        tracked_markets.append({
            "code": m.code,
            "name": m.name,
            "currency": m.currency,
            "market_score": market_score,
            "market_regime": market_regime,
            "recommendation": _recommend(market_score),
            "indicators": mkt_indicators,
        })

    return {
        "market_score": market_score,
        "market_regime": market_regime,
        "recommendation": _recommend(market_score),
        "snapshot_date": snapshot.snapshot_date.isoformat() if snapshot else None,
        "indicators": indicators,
        "top_industries": top_industries,
        "tracked_industries": tracked_industries,
        "tracked_markets": tracked_markets,
    }


# ── Public read-only lists (no auth required, used by dropdown menus) ──────────

@router.get("/markets", response_model=list[dict])
def get_public_markets(db: Session = Depends(get_db)):
    """Public endpoint: returns active markets for dropdown menus (no auth required)."""
    rows = (
        db.query(MarketConfigModel)
        .filter(MarketConfigModel.is_active.is_(True))
        .order_by(MarketConfigModel.code.asc())
        .all()
    )
    return [{"id": r.id, "code": r.code, "name": r.name, "currency": r.currency, "is_active": r.is_active, "is_tracked": r.is_tracked, "display_order": r.display_order} for r in rows]


@router.get("/industries", response_model=list[dict])
def get_public_industries(db: Session = Depends(get_db)):
    """Public endpoint: returns all industries for dropdown menus (no auth required)."""
    rows = (
        db.query(Industry)
        .order_by(Industry.market.asc(), Industry.industry_name.asc())
        .all()
    )
    return [{"id": r.id, "industry_code": r.industry_code, "industry_name": r.industry_name, "market": r.market} for r in rows]
