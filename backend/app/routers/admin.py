from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.admin import (
    AssetBulkItem,
    AssetIndicatorLinkItem,
    AssetRoleCreate,
    AssetRoleLinkItem,
    AssetRoleResponse,
    AssetRoleUpdate,
    AssetTypeConfigCreate,
    AssetTypeConfigResponse,
    AssetTypeConfigUpdate,
    AssetUpdate,
    BulkImportResponse,
    FactorCorrReportCreate,
    FactorCorrReportResponse,
    FactorCorrReportUpdate,
    IndustryUpdate,
    MarketConfigCreate,
    MarketConfigResponse,
    MarketConfigUpdate,
    RoleConfigCreate,
    RoleConfigResponse,
    RoleConfigUpdate,
    ScoreFormulaCreate,
    AnalysisModelCreate,
    AnalysisModelResponse,
    AnalysisModelUpdate,
    ScoreFormulaResponse,
    ScoreFormulaUpdate,
    StockCorrEntryCreate,
    StockCorrEntryResponse,
    StockCorrEntryUpdate,
    SymbolLookupResponse,
    UserAdminCreate,
    UserAdminResponse,
    UserAdminUpdate,
)
from app.schemas.api_config import ApiConfigCreate, ApiConfigResponse, ApiConfigUpdate
from app.schemas.industry import IndustryCreate, IndustryResponse
from app.schemas.market_indicator import (
    MarketIndicatorConfigCreate,
    MarketIndicatorConfigResponse,
    MarketIndicatorConfigUpdate,
    TrackedIndustryResponse,
)
from app.schemas.universe import AssetCreate, AssetResponse
from app.services.admin_service import (
    add_tracked_industry,
    bulk_import_assets,
    create_api_config,
    create_asset_role,
    create_asset_type_config,
    create_factor_corr_report,
    create_indicator_config,
    create_market_config,
    create_role_config,
    create_score_formula,
    create_user_admin,
    delete_api_config,
    delete_asset,
    delete_asset_role,
    delete_asset_type_config,
    delete_factor_corr_report,
    delete_indicator_config,
    delete_industry,
    delete_market_config,
    delete_role_config,
    delete_score_formula,
    delete_stock_corr_entry,
    delete_user_admin,
    get_asset_indicators,
    get_asset_roles,
    get_industry_indicators,
    get_market_config_indicators,
    list_api_configs,
    list_asset_roles,
    list_asset_type_configs,
    list_assets_admin,
    list_factor_corr_reports,
    list_indicator_configs,
    list_market_configs,
    list_role_configs,
    list_score_formulas,
    list_stock_corr_entries,
    list_tracked_industries,
    list_users_admin,
    lookup_symbol,
    remove_tracked_industry,
    reorder_market,
    set_asset_indicators,
    set_asset_roles,
    set_industry_indicators,
    set_market_config_indicators,
    update_api_config,
    update_asset,
    update_asset_role,
    update_asset_type_config,
    update_factor_corr_report,
    update_indicator_config,
    update_industry,
    update_market_config,
    update_role_config,
    update_score_formula,
    update_stock_corr_entry,
    update_user_admin,
    upsert_stock_corr_entry,
)
from app.services.industry_service import create_industry, list_industries
from app.services.universe_service import create_asset
from app.models.asset_crawler_indicator import AssetCrawlerIndicator
from pydantic import ConfigDict as PydanticConfigDict

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_auth(current_user: User = Depends(get_current_user)) -> User:
    return current_user


# ── Symbol lookup ─────────────────────────────────────────────────────────────

@router.get("/symbol-lookup", response_model=SymbolLookupResponse)
def symbol_lookup(
    symbol: str = Query(..., description="Stock symbol, e.g. 006208 or AAPL"),
    market: str = Query("TW", description="Market code, e.g. TW / US"),
    _: User = Depends(_require_auth),
):
    return lookup_symbol(symbol, market)


# ── Markets ───────────────────────────────────────────────────────────────────

@router.get("/markets", response_model=list[MarketConfigResponse])
def get_markets(db: Session = Depends(get_db), _: User = Depends(_require_auth)):
    return list_market_configs(db)


@router.post("/markets", response_model=MarketConfigResponse, status_code=status.HTTP_201_CREATED)
def post_market(
    payload: MarketConfigCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return create_market_config(db, payload)


@router.put("/markets/{market_id}", response_model=MarketConfigResponse)
def put_market(
    market_id: int,
    payload: MarketConfigUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return update_market_config(db, market_id, payload)


@router.delete("/markets/{market_id}", status_code=status.HTTP_204_NO_CONTENT)
def del_market(
    market_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    delete_market_config(db, market_id)


@router.post("/markets/{market_id}/reorder", response_model=list[MarketConfigResponse])
def reorder_market_endpoint(
    market_id: int,
    direction: str = Query("up", description="up or down"),
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return reorder_market(db, market_id, direction)


@router.get("/markets/{market_id}/indicators", response_model=list[AssetIndicatorLinkItem])
def get_mkt_indicators(
    market_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return get_market_config_indicators(db, market_id)


@router.put("/markets/{market_id}/indicators", response_model=list[AssetIndicatorLinkItem])
def set_mkt_indicators(
    market_id: int,
    indicator_ids: list[int],
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return set_market_config_indicators(db, market_id, indicator_ids)


# ── Industries ────────────────────────────────────────────────────────────────

@router.get("/industries", response_model=list[IndustryResponse])
def get_industries(db: Session = Depends(get_db), _: User = Depends(_require_auth)):
    return list_industries(db)


@router.post(
    "/industries",
    response_model=IndustryResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_industry(
    payload: IndustryCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return create_industry(db, payload)


@router.put("/industries/{industry_id}", response_model=IndustryResponse)
def put_industry(
    industry_id: int,
    payload: IndustryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return update_industry(db, industry_id, payload)


@router.delete("/industries/{industry_id}", status_code=status.HTTP_204_NO_CONTENT)
def del_industry(
    industry_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    delete_industry(db, industry_id)


@router.get("/industries/{industry_id}/indicators", response_model=list[AssetIndicatorLinkItem])
def get_ind_indicators(
    industry_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return get_industry_indicators(db, industry_id)


@router.put("/industries/{industry_id}/indicators", response_model=list[AssetIndicatorLinkItem])
def set_ind_indicators(
    industry_id: int,
    indicator_ids: list[int],
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return set_industry_indicators(db, industry_id, indicator_ids)


# ── Assets ────────────────────────────────────────────────────────────────────

@router.get("/assets", response_model=dict)
def get_assets_admin(
    search: str | None = Query(None),
    market: str | None = Query(None),
    asset_type: str | None = Query(None),
    industry_id: int | None = Query(None),
    is_active: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    items, total = list_assets_admin(
        db, search=search, market=market, asset_type=asset_type,
        industry_id=industry_id, is_active=is_active, skip=skip, limit=limit,
    )
    from app.schemas.universe import AssetResponse
    return {
        "total": total,
        "items": [AssetResponse.model_validate(a) for a in items],
    }


@router.post("/assets", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def post_asset_admin(
    payload: AssetCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return create_asset(db, payload)


@router.put("/assets/{asset_id}", response_model=AssetResponse)
def put_asset_admin(
    asset_id: int,
    payload: AssetUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return update_asset(db, asset_id, payload)


@router.delete("/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def del_asset_admin(
    asset_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    delete_asset(db, asset_id)


@router.post(
    "/assets/bulk-import",
    response_model=BulkImportResponse,
    status_code=status.HTTP_200_OK,
)
def post_bulk_import(
    items: list[AssetBulkItem],
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return bulk_import_assets(db, items)


# ── Market Indicator Configs ──────────────────────────────────────────────────

@router.get("/indicator-configs", response_model=list[MarketIndicatorConfigResponse])
def get_indicator_configs(db: Session = Depends(get_db), _: User = Depends(_require_auth)):
    return list_indicator_configs(db)


@router.post(
    "/indicator-configs",
    response_model=MarketIndicatorConfigResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_indicator_config(
    payload: MarketIndicatorConfigCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return create_indicator_config(db, payload)


@router.put("/indicator-configs/{cfg_id}", response_model=MarketIndicatorConfigResponse)
def put_indicator_config(
    cfg_id: int,
    payload: MarketIndicatorConfigUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return update_indicator_config(db, cfg_id, payload)


@router.delete("/indicator-configs/{cfg_id}", status_code=status.HTTP_204_NO_CONTENT)
def del_indicator_config(
    cfg_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    delete_indicator_config(db, cfg_id)


# ── Tracked Industries ────────────────────────────────────────────────────────

@router.get("/tracked-industries", response_model=list[TrackedIndustryResponse])
def get_tracked_industries(db: Session = Depends(get_db), _: User = Depends(_require_auth)):
    rows = list_tracked_industries(db)
    return [TrackedIndustryResponse(**r) for r in rows]


@router.post(
    "/tracked-industries",
    response_model=TrackedIndustryResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_tracked_industry(
    payload: dict,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    row = add_tracked_industry(db, payload["industry_id"])
    return TrackedIndustryResponse(**row)


@router.delete("/tracked-industries/{tracked_id}", status_code=status.HTTP_204_NO_CONTENT)
def del_tracked_industry(
    tracked_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    remove_tracked_industry(db, tracked_id)


# ── API Configs ───────────────────────────────────────────────────────────────

@router.get("/api-configs", response_model=list[ApiConfigResponse])
def get_api_configs(db: Session = Depends(get_db), _: User = Depends(_require_auth)):
    return list_api_configs(db)


@router.post("/api-configs", response_model=ApiConfigResponse, status_code=status.HTTP_201_CREATED)
def post_api_config(
    payload: ApiConfigCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return create_api_config(db, payload)


@router.put("/api-configs/{cfg_id}", response_model=ApiConfigResponse)
def put_api_config(
    cfg_id: int,
    payload: ApiConfigUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return update_api_config(db, cfg_id, payload)


@router.delete("/api-configs/{cfg_id}", status_code=status.HTTP_204_NO_CONTENT)
def del_api_config(
    cfg_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    delete_api_config(db, cfg_id)


# ── User Admin ────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserAdminResponse])
def get_users_admin(db: Session = Depends(get_db), _: User = Depends(_require_auth)):
    return list_users_admin(db)


@router.post("/users", response_model=UserAdminResponse, status_code=status.HTTP_201_CREATED)
def post_user_admin(
    payload: UserAdminCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return create_user_admin(db, payload)


@router.put("/users/{user_id}", response_model=UserAdminResponse)
def put_user_admin(
    user_id: int,
    payload: UserAdminUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return update_user_admin(db, user_id, payload)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def del_user_admin(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    delete_user_admin(db, user_id)


# ── Asset Indicator Links ─────────────────────────────────────────────────────

@router.get("/assets/{asset_id}/indicators", response_model=list[AssetIndicatorLinkItem])
def get_asset_indicators_route(
    asset_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return get_asset_indicators(db, asset_id)


@router.put("/assets/{asset_id}/indicators", response_model=list[AssetIndicatorLinkItem])
def set_asset_indicators_route(
    asset_id: int,
    indicator_ids: list[int],
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return set_asset_indicators(db, asset_id, indicator_ids)


# ── Score Formulas ────────────────────────────────────────────────────────────

@router.get("/score-formulas", response_model=list[ScoreFormulaResponse])
def get_score_formulas(
    formula_type: str | None = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return list_score_formulas(db, formula_type)


@router.post("/score-formulas", response_model=ScoreFormulaResponse, status_code=status.HTTP_201_CREATED)
def post_score_formula(
    payload: ScoreFormulaCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return create_score_formula(db, payload)


@router.put("/score-formulas/{sf_id}", response_model=ScoreFormulaResponse)
def put_score_formula(
    sf_id: int,
    payload: ScoreFormulaUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return update_score_formula(db, sf_id, payload)


@router.delete("/score-formulas/{sf_id}", status_code=status.HTTP_204_NO_CONTENT)
def del_score_formula(
    sf_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    delete_score_formula(db, sf_id)


@router.get("/score-formulas/{sf_id}/associated-modules")
def get_formula_associated_modules(
    sf_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    from app.models.market_config import MarketConfig
    from app.models.industry import Industry
    from app.models.asset import Asset

    markets = db.query(MarketConfig).filter(MarketConfig.module_validation_formula_id == sf_id).all()
    industries = db.query(Industry).filter(Industry.module_validation_formula_id == sf_id).all()
    swing_assets = db.query(Asset).filter(Asset.swing_validation_formula_id == sf_id).all()
    pos_assets = db.query(Asset).filter(Asset.position_validation_formula_id == sf_id).all()

    return {
        "markets": [{"id": m.id, "name": m.name, "code": m.code} for m in markets],
        "industries": [{"id": i.id, "name": i.industry_name} for i in industries],
        "assets": (
            [{"id": a.id, "name": a.name, "symbol": a.symbol, "section": "波段"} for a in swing_assets]
            + [{"id": a.id, "name": a.name, "symbol": a.symbol, "section": "檔位"} for a in pos_assets]
        ),
    }


# ── Asset Type Configs ────────────────────────────────────────────────────────

@router.get("/asset-type-configs", response_model=list[AssetTypeConfigResponse])
def get_asset_type_configs(db: Session = Depends(get_db), _: User = Depends(_require_auth)):
    return list_asset_type_configs(db)


@router.post("/asset-type-configs", response_model=AssetTypeConfigResponse, status_code=status.HTTP_201_CREATED)
def post_asset_type_config(
    payload: AssetTypeConfigCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return create_asset_type_config(db, payload)


@router.put("/asset-type-configs/{cfg_id}", response_model=AssetTypeConfigResponse)
def put_asset_type_config(
    cfg_id: int,
    payload: AssetTypeConfigUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return update_asset_type_config(db, cfg_id, payload)


@router.delete("/asset-type-configs/{cfg_id}", status_code=status.HTTP_204_NO_CONTENT)
def del_asset_type_config(
    cfg_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    delete_asset_type_config(db, cfg_id)


# ── Role Configs ──────────────────────────────────────────────────────────────

@router.get("/role-configs", response_model=list[RoleConfigResponse])
def get_role_configs(db: Session = Depends(get_db), _: User = Depends(_require_auth)):
    return list_role_configs(db)


@router.post("/role-configs", response_model=RoleConfigResponse, status_code=status.HTTP_201_CREATED)
def post_role_config(
    payload: RoleConfigCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return create_role_config(db, payload)


@router.put("/role-configs/{rc_id}", response_model=RoleConfigResponse)
def put_role_config(
    rc_id: int,
    payload: RoleConfigUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return update_role_config(db, rc_id, payload)


@router.delete("/role-configs/{rc_id}", status_code=status.HTTP_204_NO_CONTENT)
def del_role_config(
    rc_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    delete_role_config(db, rc_id)


# ── Factor Correlation Reports ────────────────────────────────────────────────

@router.get("/factor-corr-reports", response_model=list[FactorCorrReportResponse])
def get_factor_corr_reports(
    formula_type: str | None = Query(None),
    report_month: str | None = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return list_factor_corr_reports(db, formula_type=formula_type, report_month=report_month)


@router.post("/factor-corr-reports", response_model=FactorCorrReportResponse, status_code=status.HTTP_201_CREATED)
def post_factor_corr_report(
    payload: FactorCorrReportCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return create_factor_corr_report(db, payload)


@router.put("/factor-corr-reports/{report_id}", response_model=FactorCorrReportResponse)
def put_factor_corr_report(
    report_id: int,
    payload: FactorCorrReportUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return update_factor_corr_report(db, report_id, payload)


@router.delete("/factor-corr-reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def del_factor_corr_report(
    report_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    delete_factor_corr_report(db, report_id)


# ── Stock Correlation Entries ─────────────────────────────────────────────────

@router.get("/factor-corr-reports/{report_id}/stocks", response_model=list[StockCorrEntryResponse])
def get_stock_corr_entries(
    report_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return list_stock_corr_entries(db, report_id)


@router.post("/factor-corr-reports/{report_id}/stocks", response_model=StockCorrEntryResponse, status_code=status.HTTP_201_CREATED)
def post_stock_corr_entry(
    report_id: int,
    payload: StockCorrEntryCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return upsert_stock_corr_entry(db, report_id, payload)


@router.put("/factor-corr-reports/{report_id}/stocks/{entry_id}", response_model=StockCorrEntryResponse)
def put_stock_corr_entry(
    report_id: int,
    entry_id: int,
    payload: StockCorrEntryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return update_stock_corr_entry(db, entry_id, payload)


@router.delete("/factor-corr-reports/{report_id}/stocks/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def del_stock_corr_entry(
    report_id: int,
    entry_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    delete_stock_corr_entry(db, entry_id)


# ── Asset Roles ───────────────────────────────────────────────────────────────

@router.get("/asset-roles", response_model=list[AssetRoleResponse])
def get_asset_roles_list(db: Session = Depends(get_db), _: User = Depends(_require_auth)):
    return list_asset_roles(db)


@router.post("/asset-roles", response_model=AssetRoleResponse, status_code=status.HTTP_201_CREATED)
def post_asset_role(payload: AssetRoleCreate, db: Session = Depends(get_db), _: User = Depends(_require_auth)):
    return create_asset_role(db, payload)


@router.put("/asset-roles/{role_id}", response_model=AssetRoleResponse)
def put_asset_role(role_id: int, payload: AssetRoleUpdate, db: Session = Depends(get_db), _: User = Depends(_require_auth)):
    return update_asset_role(db, role_id, payload)


@router.delete("/asset-roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def del_asset_role(role_id: int, db: Session = Depends(get_db), _: User = Depends(_require_auth)):
    delete_asset_role(db, role_id)


# ── Asset Role Links ──────────────────────────────────────────────────────────

@router.get("/assets/{asset_id}/roles", response_model=list[AssetRoleLinkItem])
def get_asset_role_links(asset_id: int, db: Session = Depends(get_db), _: User = Depends(_require_auth)):
    return get_asset_roles(db, asset_id)


@router.put("/assets/{asset_id}/roles", response_model=list[AssetRoleLinkItem])
def put_asset_role_links(
    asset_id: int,
    role_ids: list[int],
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return set_asset_roles(db, asset_id, role_ids)


# ── Asset Analysis Config ─────────────────────────────────────────────────────

from pydantic import BaseModel as _PBM
from typing import Optional as _Opt


class _AnalysisConfigPayload(_PBM):
    technical_indicators: _Opt[list[str]] = None
    fundamental_indicators: _Opt[list[str]] = None
    chips_indicators: _Opt[list[str]] = None
    applied_models: _Opt[list[str]] = None
    show_technical: bool = True
    show_fundamental: bool = True
    show_chips: bool = False
    show_model_score: bool = True
    show_recommendation: bool = True
    show_risk: bool = False
    show_backtest_summary: bool = False


@router.get("/assets/{asset_id}/analysis-config")
def get_analysis_config(asset_id: int, db: Session = Depends(get_db), _: User = Depends(_require_auth)):
    from app.models.asset_analysis_config import AssetAnalysisConfig
    row = db.query(AssetAnalysisConfig).filter(AssetAnalysisConfig.asset_id == asset_id).first()
    if not row:
        return {
            "asset_id": asset_id,
            "technical_indicators": [],
            "fundamental_indicators": [],
            "chips_indicators": [],
            "applied_models": [],
            "show_technical": True, "show_fundamental": True, "show_chips": False,
            "show_model_score": True, "show_recommendation": True,
            "show_risk": False, "show_backtest_summary": False,
        }
    return {
        "asset_id": row.asset_id,
        "technical_indicators": row.technical_indicators or [],
        "fundamental_indicators": row.fundamental_indicators or [],
        "chips_indicators": row.chips_indicators or [],
        "applied_models": row.applied_models or [],
        "show_technical": row.show_technical,
        "show_fundamental": row.show_fundamental,
        "show_chips": row.show_chips,
        "show_model_score": row.show_model_score,
        "show_recommendation": row.show_recommendation,
        "show_risk": row.show_risk,
        "show_backtest_summary": row.show_backtest_summary,
    }


@router.put("/assets/{asset_id}/analysis-config")
def put_analysis_config(
    asset_id: int,
    body: _AnalysisConfigPayload,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    from app.models.asset_analysis_config import AssetAnalysisConfig
    row = db.query(AssetAnalysisConfig).filter(AssetAnalysisConfig.asset_id == asset_id).first()
    if row:
        for field, val in body.model_dump().items():
            setattr(row, field, val)
    else:
        row = AssetAnalysisConfig(asset_id=asset_id, **body.model_dump())
        db.add(row)
    db.commit()
    db.refresh(row)
    return get_analysis_config(asset_id, db, _)


# ── Asset Data Sync Controls ──────────────────────────────────────────────────

from datetime import date as _date


@router.post("/assets/{asset_id}/sync/start")
def start_sync(asset_id: int, db: Session = Depends(get_db), _: User = Depends(_require_auth)):
    from app.models.universe import Asset
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        from fastapi import HTTPException
        raise HTTPException(404, "Asset not found")
    asset.data_sync_enabled = True
    db.commit()
    return {"asset_id": asset_id, "data_sync_enabled": True}


@router.post("/assets/{asset_id}/sync/pause")
def pause_sync(asset_id: int, db: Session = Depends(get_db), _: User = Depends(_require_auth)):
    from app.models.universe import Asset
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        from fastapi import HTTPException
        raise HTTPException(404, "Asset not found")
    asset.data_sync_enabled = False
    db.commit()
    return {"asset_id": asset_id, "data_sync_enabled": False}


@router.delete("/assets/{asset_id}/price-data", status_code=status.HTTP_200_OK)
def delete_price_data(
    asset_id: int,
    start_date: _Opt[_date] = None,
    end_date: _Opt[_date] = None,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    """Delete price data for an asset. If start_date/end_date are given, delete only that range."""
    # price_data table implementation pending; returns count of deleted rows
    deleted = 0
    try:
        from sqlalchemy import text
        if start_date and end_date:
            result = db.execute(
                text("DELETE FROM price_data WHERE asset_id = :aid AND date BETWEEN :s AND :e"),
                {"aid": asset_id, "s": start_date, "e": end_date},
            )
        elif start_date:
            result = db.execute(
                text("DELETE FROM price_data WHERE asset_id = :aid AND date >= :s"),
                {"aid": asset_id, "s": start_date},
            )
        elif end_date:
            result = db.execute(
                text("DELETE FROM price_data WHERE asset_id = :aid AND date <= :e"),
                {"aid": asset_id, "e": end_date},
            )
        else:
            result = db.execute(
                text("DELETE FROM price_data WHERE asset_id = :aid"),
                {"aid": asset_id},
            )
        db.commit()
        deleted = result.rowcount
    except Exception:
        pass  # table may not exist yet
    return {"asset_id": asset_id, "deleted_rows": deleted}


# ── Analysis Models ───────────────────────────────────────────────────────────

from app.models.analysis_model import AnalysisModel


@router.get("/analysis-models", response_model=list[AnalysisModelResponse])
def list_analysis_models(
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return db.query(AnalysisModel).order_by(AnalysisModel.scope_type, AnalysisModel.name, AnalysisModel.version).all()


@router.post("/analysis-models", response_model=AnalysisModelResponse, status_code=status.HTTP_201_CREATED)
def create_analysis_model(
    body: AnalysisModelCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    m = AnalysisModel(**body.model_dump())
    db.add(m); db.commit(); db.refresh(m)
    return m


@router.put("/analysis-models/{model_id}", response_model=AnalysisModelResponse)
def update_analysis_model(
    model_id: int,
    body: AnalysisModelUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    m = db.query(AnalysisModel).filter(AnalysisModel.id == model_id).first()
    if not m:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Model not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(m, k, v)
    db.commit(); db.refresh(m)
    return m


@router.delete("/analysis-models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis_model(
    model_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    m = db.query(AnalysisModel).filter(AnalysisModel.id == model_id).first()
    if m:
        db.delete(m); db.commit()


# ─── Model Validation Records ─────────────────────────────────────────────────

from app.models.model_validation_record import ModelValidationRecord


class ModelValidationRecordCreate(BaseModel):
    validation_indicator_id: Optional[int] = None
    validation_indicator_name: Optional[str] = None
    model_score: Optional[float] = None
    validation_asset: Optional[str] = None
    asset_value: Optional[float] = None
    price_change_pct: Optional[float] = None
    fit_rate: Optional[float] = None
    record_date: Optional[str] = None
    notes: Optional[str] = None


def _mvr_dict(r: ModelValidationRecord) -> dict:
    return {
        "id": r.id, "model_id": r.model_id,
        "validation_indicator_id": r.validation_indicator_id,
        "validation_indicator_name": r.validation_indicator_name,
        "model_score": r.model_score, "validation_asset": r.validation_asset,
        "asset_value": r.asset_value, "price_change_pct": r.price_change_pct,
        "fit_rate": r.fit_rate,
        "record_date": r.record_date, "notes": r.notes,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("/analysis-models/{model_id}/validation-records")
def list_model_validation_records(
    model_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    rows = db.query(ModelValidationRecord).filter(
        ModelValidationRecord.model_id == model_id
    ).order_by(ModelValidationRecord.record_date.desc()).all()
    return [_mvr_dict(r) for r in rows]


@router.post("/analysis-models/{model_id}/validation-records", status_code=status.HTTP_201_CREATED)
def create_model_validation_record(
    model_id: int,
    body: ModelValidationRecordCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    r = ModelValidationRecord(model_id=model_id, **body.model_dump())
    db.add(r); db.commit(); db.refresh(r)
    return _mvr_dict(r)


@router.delete("/analysis-models/validation-records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model_validation_record(
    record_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    r = db.query(ModelValidationRecord).filter(ModelValidationRecord.id == record_id).first()
    if r:
        db.delete(r); db.commit()


# ─── Crawler ──────────────────────────────────────────────────────────────────

from app.models.asset import Asset as AssetModel
from app.models.asset_daily_data import AssetDailyData


class CrawlerConfigUpdate(BaseModel):
    crawler_enabled: Optional[bool] = None
    crawler_indicator_ids: Optional[list[int]] = None
    crawler_years: Optional[int] = None


class AssetDailyDataCreate(BaseModel):
    record_date: str          # "YYYY-MM-DD"
    field_key: str
    display_name: str
    category: Optional[str] = None
    value: Optional[float] = None
    raw_text: Optional[str] = None
    source: Optional[str] = "manual"
    notes: Optional[str] = None


class AssetDailyDataResponse(BaseModel):
    id: int
    asset_id: int
    record_date: str
    field_key: str
    display_name: str
    category: Optional[str] = None
    value: Optional[float] = None
    raw_text: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


@router.get("/assets/{asset_id}/crawler/data", response_model=dict)
def list_crawler_data(
    asset_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    field_key: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    q = db.query(AssetDailyData).filter(AssetDailyData.asset_id == asset_id)
    if field_key:
        q = q.filter(AssetDailyData.field_key == field_key)
    total = q.count()
    rows = q.order_by(AssetDailyData.record_date.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [
            {
                "id": r.id, "asset_id": r.asset_id,
                "record_date": str(r.record_date), "field_key": r.field_key,
                "display_name": r.display_name, "category": r.category,
                "value": r.value, "raw_text": r.raw_text,
                "source": r.source, "notes": r.notes,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.post("/assets/{asset_id}/crawler/data", status_code=status.HTTP_201_CREATED)
def add_crawler_data(
    asset_id: int,
    body: AssetDailyDataCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    from datetime import date
    record = AssetDailyData(
        asset_id=asset_id,
        record_date=date.fromisoformat(body.record_date),
        field_key=body.field_key,
        display_name=body.display_name,
        category=body.category,
        value=body.value,
        raw_text=body.raw_text,
        source=body.source or "manual",
        notes=body.notes,
    )
    db.add(record); db.commit(); db.refresh(record)
    return {"id": record.id, "record_date": str(record.record_date), "field_key": record.field_key,
            "display_name": record.display_name, "category": record.category,
            "value": record.value, "source": record.source}


@router.delete("/assets/{asset_id}/crawler/data/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_crawler_data(
    asset_id: int,
    record_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    r = db.query(AssetDailyData).filter(AssetDailyData.id == record_id, AssetDailyData.asset_id == asset_id).first()
    if r:
        db.delete(r); db.commit()


@router.post("/assets/{asset_id}/crawler/start", status_code=status.HTTP_200_OK)
def start_crawler(
    asset_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    asset = db.query(AssetModel).filter(AssetModel.id == asset_id).first()
    if not asset:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Asset not found")
    asset.crawler_enabled = True
    asset.crawler_start_time = datetime.now(timezone.utc)
    asset.crawler_stop_time = None
    db.commit(); db.refresh(asset)
    return {"crawler_enabled": asset.crawler_enabled,
            "crawler_start_time": asset.crawler_start_time.isoformat() if asset.crawler_start_time else None}


@router.post("/assets/{asset_id}/crawler/stop", status_code=status.HTTP_200_OK)
def stop_crawler(
    asset_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    asset = db.query(AssetModel).filter(AssetModel.id == asset_id).first()
    if not asset:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Asset not found")
    asset.crawler_enabled = False
    asset.crawler_stop_time = datetime.now(timezone.utc)
    db.commit(); db.refresh(asset)
    return {"crawler_enabled": asset.crawler_enabled,
            "crawler_stop_time": asset.crawler_stop_time.isoformat() if asset.crawler_stop_time else None}


@router.put("/assets/{asset_id}/crawler/config", status_code=status.HTTP_200_OK)
def update_crawler_config(
    asset_id: int,
    body: CrawlerConfigUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    asset = db.query(AssetModel).filter(AssetModel.id == asset_id).first()
    if not asset:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Asset not found")
    if body.crawler_indicator_ids is not None:
        asset.crawler_indicator_ids = body.crawler_indicator_ids
    if body.crawler_years is not None:
        asset.crawler_years = body.crawler_years
    db.commit(); db.refresh(asset)
    return {
        "crawler_indicator_ids": asset.crawler_indicator_ids,
        "crawler_years": asset.crawler_years,
    }


# ── Per-indicator Crawler Config ──────────────────────────────────────────────

class AssetCrawlerIndicatorCreate(BaseModel):
    indicator_id: Optional[int] = None
    indicator_name: str
    indicator_type: Optional[str] = None
    api_source_id: Optional[int] = None
    is_enabled: bool = True
    auto_crawl_enabled: bool = False
    manual_crawl_enabled: bool = True
    crawl_frequency: Optional[str] = None
    crawl_time: Optional[str] = None


class AssetCrawlerIndicatorUpdate(BaseModel):
    indicator_name: Optional[str] = None
    indicator_type: Optional[str] = None
    api_source_id: Optional[int] = None
    is_enabled: Optional[bool] = None
    auto_crawl_enabled: Optional[bool] = None
    manual_crawl_enabled: Optional[bool] = None
    crawl_frequency: Optional[str] = None
    crawl_time: Optional[str] = None
    crawl_status: Optional[str] = None
    error_message: Optional[str] = None
    last_crawled_at: Optional[datetime] = None
    next_crawl_at: Optional[datetime] = None
    last_manual_crawled_at: Optional[datetime] = None


class AssetCrawlerIndicatorResponse(BaseModel):
    id: int
    asset_id: int
    indicator_id: Optional[int]
    indicator_name: str
    indicator_type: Optional[str]
    api_source_id: Optional[int]
    is_enabled: bool
    auto_crawl_enabled: bool
    manual_crawl_enabled: bool
    crawl_frequency: Optional[str]
    crawl_time: Optional[str]
    last_crawled_at: Optional[datetime]
    next_crawl_at: Optional[datetime]
    last_manual_crawled_at: Optional[datetime]
    crawl_status: str
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = PydanticConfigDict(from_attributes=True)


@router.get("/assets/{asset_id}/crawler/indicators", response_model=list[AssetCrawlerIndicatorResponse])
def list_crawler_indicators(
    asset_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    return db.query(AssetCrawlerIndicator).filter(AssetCrawlerIndicator.asset_id == asset_id).all()


@router.post("/assets/{asset_id}/crawler/indicators", response_model=AssetCrawlerIndicatorResponse, status_code=status.HTTP_201_CREATED)
def add_crawler_indicator(
    asset_id: int,
    body: AssetCrawlerIndicatorCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    from fastapi import HTTPException as _HTTPException
    existing = db.query(AssetCrawlerIndicator).filter(
        AssetCrawlerIndicator.asset_id == asset_id,
        AssetCrawlerIndicator.indicator_id == body.indicator_id,
    ).first()
    if existing and body.indicator_id is not None:
        raise _HTTPException(status_code=409, detail="Indicator already configured for this asset")
    row = AssetCrawlerIndicator(asset_id=asset_id, **body.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row


@router.put("/assets/{asset_id}/crawler/indicators/{config_id}", response_model=AssetCrawlerIndicatorResponse)
def update_crawler_indicator(
    asset_id: int,
    config_id: int,
    body: AssetCrawlerIndicatorUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    from fastapi import HTTPException as _HTTPException
    row = db.query(AssetCrawlerIndicator).filter(
        AssetCrawlerIndicator.id == config_id,
        AssetCrawlerIndicator.asset_id == asset_id,
    ).first()
    if not row:
        raise _HTTPException(status_code=404, detail="Config not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit(); db.refresh(row)
    return row


@router.delete("/assets/{asset_id}/crawler/indicators/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_crawler_indicator(
    asset_id: int,
    config_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    from fastapi import HTTPException as _HTTPException
    row = db.query(AssetCrawlerIndicator).filter(
        AssetCrawlerIndicator.id == config_id,
        AssetCrawlerIndicator.asset_id == asset_id,
    ).first()
    if not row:
        raise _HTTPException(status_code=404, detail="Config not found")
    db.delete(row); db.commit()


@router.post("/assets/{asset_id}/crawler/indicators/{config_id}/crawl-now", response_model=AssetCrawlerIndicatorResponse)
def crawl_indicator_now(
    asset_id: int,
    config_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    from fastapi import HTTPException as _HTTPException
    row = db.query(AssetCrawlerIndicator).filter(
        AssetCrawlerIndicator.id == config_id,
        AssetCrawlerIndicator.asset_id == asset_id,
    ).first()
    if not row:
        raise _HTTPException(status_code=404, detail="Config not found")
    if not row.is_enabled:
        raise _HTTPException(status_code=400, detail="Indicator not enabled")
    if not row.manual_crawl_enabled:
        raise _HTTPException(status_code=400, detail="Manual crawl not enabled for this indicator")
    now = datetime.now(timezone.utc)
    row.crawl_status = "running"
    db.commit()
    # Simulate crawl completion (real implementation would queue a task)
    row.crawl_status = "success"
    row.last_crawled_at = now
    row.last_manual_crawled_at = now
    db.commit(); db.refresh(row)
    return row


@router.post("/assets/{asset_id}/crawler/indicators/{config_id}/stop", response_model=AssetCrawlerIndicatorResponse)
def stop_crawler_indicator(
    asset_id: int,
    config_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    from fastapi import HTTPException as _HTTPException
    row = db.query(AssetCrawlerIndicator).filter(
        AssetCrawlerIndicator.id == config_id,
        AssetCrawlerIndicator.asset_id == asset_id,
    ).first()
    if not row:
        raise _HTTPException(status_code=404, detail="Config not found")
    row.auto_crawl_enabled = False
    row.manual_crawl_enabled = False
    row.crawl_status = "stopped"
    db.commit(); db.refresh(row)
    return row


# ── Generic Scope Crawler (market / industry) ─────────────────────────────────

from app.models.crawler_indicator_config import CrawlerIndicatorConfig
from app.models.market_config import MarketConfig as MarketConfigModel
from app.models.industry import Industry as IndustryModel

VALID_SCOPES = {"market", "industry"}


def _get_scope_entity(scope_type: str, scope_id: int, db: Session):
    from fastapi import HTTPException as _HE
    if scope_type == "market":
        obj = db.query(MarketConfigModel).filter(MarketConfigModel.id == scope_id).first()
    elif scope_type == "industry":
        obj = db.query(IndustryModel).filter(IndustryModel.id == scope_id).first()
    else:
        raise _HE(status_code=400, detail=f"Invalid scope_type: {scope_type}")
    if not obj:
        raise _HE(status_code=404, detail=f"{scope_type} {scope_id} not found")
    return obj


@router.get("/crawler/{scope_type}/{scope_id}/indicators", response_model=list[AssetCrawlerIndicatorResponse])
def list_scope_crawler_indicators(
    scope_type: str,
    scope_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    from fastapi import HTTPException as _HE
    if scope_type not in VALID_SCOPES:
        raise _HE(status_code=400, detail="Invalid scope_type")
    return db.query(CrawlerIndicatorConfig).filter(
        CrawlerIndicatorConfig.scope_type == scope_type,
        CrawlerIndicatorConfig.scope_id == scope_id,
    ).all()


@router.post("/crawler/{scope_type}/{scope_id}/indicators", response_model=AssetCrawlerIndicatorResponse, status_code=status.HTTP_201_CREATED)
def add_scope_crawler_indicator(
    scope_type: str,
    scope_id: int,
    body: AssetCrawlerIndicatorCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    from fastapi import HTTPException as _HE
    if scope_type not in VALID_SCOPES:
        raise _HE(status_code=400, detail="Invalid scope_type")
    if body.indicator_id is not None:
        existing = db.query(CrawlerIndicatorConfig).filter(
            CrawlerIndicatorConfig.scope_type == scope_type,
            CrawlerIndicatorConfig.scope_id == scope_id,
            CrawlerIndicatorConfig.indicator_id == body.indicator_id,
        ).first()
        if existing:
            raise _HE(status_code=409, detail="Indicator already configured for this scope")
    row = CrawlerIndicatorConfig(scope_type=scope_type, scope_id=scope_id, **body.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row


@router.put("/crawler/{scope_type}/{scope_id}/indicators/{config_id}", response_model=AssetCrawlerIndicatorResponse)
def update_scope_crawler_indicator(
    scope_type: str,
    scope_id: int,
    config_id: int,
    body: AssetCrawlerIndicatorUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    from fastapi import HTTPException as _HE
    row = db.query(CrawlerIndicatorConfig).filter(
        CrawlerIndicatorConfig.id == config_id,
        CrawlerIndicatorConfig.scope_type == scope_type,
        CrawlerIndicatorConfig.scope_id == scope_id,
    ).first()
    if not row:
        raise _HE(status_code=404, detail="Config not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit(); db.refresh(row)
    return row


@router.delete("/crawler/{scope_type}/{scope_id}/indicators/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scope_crawler_indicator(
    scope_type: str,
    scope_id: int,
    config_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    from fastapi import HTTPException as _HE
    row = db.query(CrawlerIndicatorConfig).filter(
        CrawlerIndicatorConfig.id == config_id,
        CrawlerIndicatorConfig.scope_type == scope_type,
        CrawlerIndicatorConfig.scope_id == scope_id,
    ).first()
    if not row:
        raise _HE(status_code=404, detail="Config not found")
    db.delete(row); db.commit()


@router.post("/crawler/{scope_type}/{scope_id}/indicators/{config_id}/crawl-now", response_model=AssetCrawlerIndicatorResponse)
def crawl_scope_indicator_now(
    scope_type: str,
    scope_id: int,
    config_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    from fastapi import HTTPException as _HE
    row = db.query(CrawlerIndicatorConfig).filter(
        CrawlerIndicatorConfig.id == config_id,
        CrawlerIndicatorConfig.scope_type == scope_type,
        CrawlerIndicatorConfig.scope_id == scope_id,
    ).first()
    if not row:
        raise _HE(status_code=404, detail="Config not found")
    if not row.is_enabled:
        raise _HE(status_code=400, detail="Indicator not enabled")
    if not row.manual_crawl_enabled:
        raise _HE(status_code=400, detail="Manual crawl not enabled")
    now = datetime.now(timezone.utc)
    row.crawl_status = "success"
    row.last_crawled_at = now
    row.last_manual_crawled_at = now
    db.commit(); db.refresh(row)
    return row


@router.post("/crawler/{scope_type}/{scope_id}/indicators/{config_id}/stop", response_model=AssetCrawlerIndicatorResponse)
def stop_scope_crawler_indicator(
    scope_type: str,
    scope_id: int,
    config_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    from fastapi import HTTPException as _HE
    row = db.query(CrawlerIndicatorConfig).filter(
        CrawlerIndicatorConfig.id == config_id,
        CrawlerIndicatorConfig.scope_type == scope_type,
        CrawlerIndicatorConfig.scope_id == scope_id,
    ).first()
    if not row:
        raise _HE(status_code=404, detail="Config not found")
    row.auto_crawl_enabled = False
    row.manual_crawl_enabled = False
    row.crawl_status = "stopped"
    db.commit(); db.refresh(row)
    return row


@router.post("/crawler/{scope_type}/{scope_id}/start")
def start_scope_crawler(
    scope_type: str,
    scope_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    obj = _get_scope_entity(scope_type, scope_id, db)
    obj.crawler_enabled = True
    obj.crawler_start_time = datetime.now(timezone.utc)
    obj.crawler_stop_time = None
    db.commit(); db.refresh(obj)
    return {"crawler_enabled": obj.crawler_enabled,
            "crawler_start_time": obj.crawler_start_time.isoformat() if obj.crawler_start_time else None}


@router.post("/crawler/{scope_type}/{scope_id}/stop")
def stop_scope_crawler(
    scope_type: str,
    scope_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    obj = _get_scope_entity(scope_type, scope_id, db)
    obj.crawler_enabled = False
    obj.crawler_stop_time = datetime.now(timezone.utc)
    db.commit(); db.refresh(obj)
    return {"crawler_enabled": obj.crawler_enabled,
            "crawler_stop_time": obj.crawler_stop_time.isoformat() if obj.crawler_stop_time else None}


@router.put("/crawler/{scope_type}/{scope_id}/config")
def update_scope_crawler_config(
    scope_type: str,
    scope_id: int,
    body: CrawlerConfigUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_auth),
):
    obj = _get_scope_entity(scope_type, scope_id, db)
    if body.crawler_years is not None:
        obj.crawler_years = body.crawler_years
    db.commit(); db.refresh(obj)
    return {"crawler_years": obj.crawler_years}
