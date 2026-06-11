"""
波段推薦服務

推薦來源（只處理已管理的標的，不做全市場掃描）：
  1. tracking_status IN ("core", "observation") 的產業底下的標的
  2. in_swing_pool = True 的標的
  3. user_id 自選股裡的標的（可選）

SwingScore = StockScore × 40% + IndustryScore × 30% + MarketScore × 20% + MomentumScore × 10%
目前 score 來源：從 asset_scores / swing_trade_setups 取最新值，若無則用預設 50。
"""

from sqlalchemy.orm import Session

from app.models.asset import Asset, UserWatchlist
from app.models.industry import Industry, IndustryMomentum
from app.models.asset_role import AssetRole
from app.models.asset_role_link import AssetRoleLink


# 分數閾值
THRESHOLD_STRONG = 85
THRESHOLD_WATCH = 75
THRESHOLD_NORMAL = 60


def _get_label(score: float) -> str:
    if score >= THRESHOLD_STRONG:
        return "強烈關注"
    if score >= THRESHOLD_WATCH:
        return "可觀察"
    if score >= THRESHOLD_NORMAL:
        return "普通"
    return "不推薦"


def _get_latest_industry_score(db: Session, industry_id: int | None) -> float:
    """Get latest momentum score for an industry. Returns 50 if not available."""
    if not industry_id:
        return 50.0
    latest = (
        db.query(IndustryMomentum)
        .filter(IndustryMomentum.industry_id == industry_id)
        .order_by(IndustryMomentum.snapshot_date.desc(), IndustryMomentum.id.desc())
        .first()
    )
    if latest and latest.momentum_score is not None:
        return float(latest.momentum_score)
    return 50.0


def _get_asset_roles(db: Session, asset_id: int) -> list[dict]:
    rows = (
        db.query(AssetRoleLink, AssetRole)
        .join(AssetRole, AssetRole.id == AssetRoleLink.role_id)
        .filter(AssetRoleLink.asset_id == asset_id)
        .all()
    )
    return [{"code": r.code, "name": r.name, "color": r.color} for _, r in rows]


def _score_asset(asset: Asset, industry_score: float, market_score: float) -> dict:
    """
    計算 SwingScore。
    StockScore 和 MomentumScore 目前用預設值 50，
    待接入 asset_scores 表後可替換。
    """
    stock_score = 50.0    # TODO: 接 asset_scores 最新值
    momentum_score = industry_score  # 暫用 industry momentum 代替

    swing_score = (
        stock_score * 0.40
        + industry_score * 0.30
        + market_score * 0.20
        + momentum_score * 0.10
    )
    return {
        "stock_score": round(stock_score, 1),
        "industry_score": round(industry_score, 1),
        "market_score": round(market_score, 1),
        "momentum_score": round(momentum_score, 1),
        "swing_score": round(swing_score, 1),
        "label": _get_label(swing_score),
    }


def get_swing_recommendations(
    db: Session,
    user_id: int | None = None,
    market_score: float = 50.0,
    limit: int = 20,
) -> list[dict]:
    """
    回傳波段推薦候選清單，依 SwingScore 降序。
    """
    candidate_ids: set[int] = set()

    # 1. 核心追蹤 / 觀察 產業底下的標的
    tracked_industry_ids: list[int] = [
        row.id for row in db.query(Industry.id).filter(
            Industry.tracking_status.in_(["core", "observation"])
        ).all()
    ]
    if tracked_industry_ids:
        industry_assets = db.query(Asset.id).filter(
            Asset.industry_id.in_(tracked_industry_ids),
            Asset.is_active.is_(True),
        ).all()
        candidate_ids.update(row.id for row in industry_assets)

    # 2. 波段推薦池標的
    pool_assets = db.query(Asset.id).filter(
        Asset.in_swing_pool.is_(True),
        Asset.is_active.is_(True),
    ).all()
    candidate_ids.update(row.id for row in pool_assets)

    # 3. 使用者自選股
    if user_id:
        watchlist_assets = db.query(UserWatchlist.asset_id).filter(
            UserWatchlist.user_id == user_id
        ).all()
        candidate_ids.update(row.asset_id for row in watchlist_assets)

    if not candidate_ids:
        return []

    assets = (
        db.query(Asset)
        .filter(Asset.id.in_(candidate_ids), Asset.is_active.is_(True))
        .all()
    )

    results = []
    for asset in assets:
        industry_score = _get_latest_industry_score(db, asset.industry_id)
        scores = _score_asset(asset, industry_score, market_score)
        roles = _get_asset_roles(db, asset.id)

        industry_name = None
        if asset.industry_id:
            ind = db.query(Industry).filter(Industry.id == asset.industry_id).first()
            if ind:
                industry_name = ind.industry_name

        results.append({
            "asset_id": asset.id,
            "symbol": asset.symbol,
            "name": asset.name,
            "market": asset.market,
            "asset_type": asset.asset_type,
            "currency": asset.currency,
            "industry_id": asset.industry_id,
            "industry_name": industry_name,
            "in_swing_pool": asset.in_swing_pool,
            "in_newsletter": asset.in_newsletter,
            "roles": roles,
            **scores,
        })

    results.sort(key=lambda x: x["swing_score"], reverse=True)
    return results[:limit]
