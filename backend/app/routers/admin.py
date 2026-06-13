from fastapi import APIRouter, Depends, Query, status
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
