from datetime import datetime

from pydantic import BaseModel, ConfigDict


# ── User admin ───────────────────────────────────────────────────────────────

class UserAdminResponse(BaseModel):
    id: int
    email: str
    name: str | None = None
    role: str = "user"
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserAdminCreate(BaseModel):
    email: str
    password: str
    name: str | None = None
    role: str = "user"


class UserAdminUpdate(BaseModel):
    role: str | None = None
    name: str | None = None
    new_password: str | None = None


# ── Asset-Indicator link ──────────────────────────────────────────────────────

class AssetIndicatorLinkItem(BaseModel):
    id: int
    indicator_config_id: int
    field_key: str
    display_name: str
    model_config = ConfigDict(from_attributes=True)


# ── Score Formula ─────────────────────────────────────────────────────────────

class ScoreFormulaResponse(BaseModel):
    id: int
    formula_type: str
    field_key: str
    display_name: str
    weight: float
    is_active: bool
    use_in_calc: bool
    is_reverse: bool = False
    display_order: int
    model_config = ConfigDict(from_attributes=True)


class ScoreFormulaCreate(BaseModel):
    formula_type: str
    field_key: str
    display_name: str
    weight: float = 0.0
    is_active: bool = True
    use_in_calc: bool = True
    is_reverse: bool = False
    display_order: int = 0


class ScoreFormulaUpdate(BaseModel):
    display_name: str | None = None
    weight: float | None = None
    is_active: bool | None = None
    use_in_calc: bool | None = None
    is_reverse: bool | None = None
    display_order: int | None = None


# ── MarketConfig ────────────────────────────────────────────────────────────

class MarketConfigCreate(BaseModel):
    code: str
    name: str
    currency: str
    description: str | None = None
    is_active: bool = True


class MarketConfigUpdate(BaseModel):
    name: str | None = None
    currency: str | None = None
    description: str | None = None
    is_active: bool | None = None
    is_tracked: bool | None = None
    display_order: int | None = None
    current_model_id: int | None = None
    module_calc_indicator_ids: list[int] | None = None
    module_validation_asset_ids: list[int] | None = None
    module_validation_indicator_ids: list[int] | None = None
    module_validation_period_days: int | None = None
    module_result_indicator_ids: list[int] | None = None
    module_formula_expr: str | None = None
    module_validation_conditions: str | None = None


class MarketConfigResponse(BaseModel):
    id: int
    code: str
    name: str
    currency: str
    description: str | None = None
    is_active: bool
    is_tracked: bool = False
    display_order: int = 0
    current_model_id: int | None = None
    module_calc_indicator_ids: list[int] | None = None
    module_validation_asset_ids: list[int] | None = None
    module_validation_indicator_ids: list[int] | None = None
    module_validation_period_days: int | None = None
    module_result_indicator_ids: list[int] | None = None
    module_formula_expr: str | None = None
    module_validation_conditions: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Asset update / bulk ──────────────────────────────────────────────────────

class AssetUpdate(BaseModel):
    name: str | None = None
    market: str | None = None
    asset_type: str | None = None
    industry_id: int | None = None
    api_config_id: int | None = None
    api_code: str | None = None
    description: str | None = None
    currency: str | None = None
    update_frequency: str | None = None
    in_swing_pool: bool | None = None
    in_newsletter: bool | None = None
    needs_backtest: bool | None = None
    is_penny_stock: bool | None = None
    is_active: bool | None = None
    current_model_id: int | None = None
    module_calc_indicator_ids: list[int] | None = None
    module_validation_asset_ids: list[int] | None = None
    module_validation_indicator_ids: list[int] | None = None
    module_validation_period_days: int | None = None
    module_result_indicator_ids: list[int] | None = None
    module_formula_expr: str | None = None
    module_validation_conditions: str | None = None


class AssetBulkItem(BaseModel):
    symbol: str
    name: str
    market: str
    asset_type: str = "stock"
    industry_id: int | None = None
    currency: str
    is_penny_stock: bool = False
    is_active: bool = True


class BulkImportResponse(BaseModel):
    created: int
    skipped: int
    errors: list[str]


# ── Industry update ──────────────────────────────────────────────────────────

class IndustryUpdate(BaseModel):
    industry_name: str | None = None
    market: str | None = None
    description: str | None = None
    tracking_status: str | None = None  # "core" | "observation" | "disabled"
    current_model_id: int | None = None
    module_calc_indicator_ids: list[int] | None = None
    module_validation_asset_ids: list[int] | None = None
    module_validation_indicator_ids: list[int] | None = None
    module_validation_period_days: int | None = None
    module_result_indicator_ids: list[int] | None = None
    module_formula_expr: str | None = None
    module_validation_conditions: str | None = None


# ── Analysis Model ───────────────────────────────────────────────────────────

class AnalysisModelCreate(BaseModel):
    name: str
    version: str
    scope_type: str           # "market" | "industry" | "asset"
    market_code: str | None = None
    source_id: int | None = None
    description: str | None = None
    status: str = "testing"   # "active" | "testing" | "disabled"
    formula_snapshot: dict | None = None
    validation_snapshot: dict | None = None


class AnalysisModelUpdate(BaseModel):
    name: str | None = None
    version: str | None = None
    scope_type: str | None = None
    market_code: str | None = None
    source_id: int | None = None
    description: str | None = None
    status: str | None = None
    formula_snapshot: dict | None = None
    validation_snapshot: dict | None = None


class AnalysisModelResponse(BaseModel):
    id: int
    name: str
    version: str
    scope_type: str
    market_code: str | None = None
    source_id: int | None = None
    description: str | None = None
    status: str
    formula_snapshot: dict | None = None
    validation_snapshot: dict | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Symbol lookup ────────────────────────────────────────────────────────────

class SymbolLookupResponse(BaseModel):
    symbol: str
    name: str | None
    long_name: str | None
    market: str
    asset_type: str | None
    currency: str | None
    found: bool


# ── Asset Type Config ─────────────────────────────────────────────────────────

class AssetTypeConfigResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str | None = None
    is_active: bool
    display_order: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AssetTypeConfigCreate(BaseModel):
    code: str
    name: str
    description: str | None = None
    is_active: bool = True
    display_order: int = 0


class AssetTypeConfigUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
    display_order: int | None = None


# ── Role Config ───────────────────────────────────────────────────────────────

class RoleConfigResponse(BaseModel):
    id: int
    name: str
    label: str
    description: str | None = None
    features: list[str] | None = None
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class RoleConfigCreate(BaseModel):
    name: str
    label: str
    description: str | None = None
    features: list[str] | None = None
    is_active: bool = True


class RoleConfigUpdate(BaseModel):
    label: str | None = None
    description: str | None = None
    features: list[str] | None = None
    is_active: bool | None = None


# ── Factor Correlation Report ─────────────────────────────────────────────────

class FactorEntryItem(BaseModel):
    field_key: str
    display_name: str
    weight: float = 0.0
    corr_score: float | None = None


class FactorCorrReportCreate(BaseModel):
    report_month: str                               # "2026-06"
    formula_type: str
    market_score_actual_corr: float | None = None
    factor_entries: list[FactorEntryItem] | None = None
    notes: str | None = None


class FactorCorrReportUpdate(BaseModel):
    market_score_actual_corr: float | None = None
    factor_entries: list[FactorEntryItem] | None = None
    notes: str | None = None


class FactorCorrReportResponse(BaseModel):
    id: int
    report_month: str
    formula_type: str
    market_score_actual_corr: float | None = None
    factor_entries: list[dict] | None = None
    notes: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Stock Correlation Entry ───────────────────────────────────────────────────

class StockIndicatorWeightItem(BaseModel):
    field_key: str
    display_name: str
    weight: float = 0.0
    corr_score: float | None = None


class StockCorrEntryCreate(BaseModel):
    asset_id: int | None = None
    symbol: str
    name: str | None = None
    total_score_actual_corr: float | None = None
    indicator_weights: list[StockIndicatorWeightItem] | None = None


class StockCorrEntryUpdate(BaseModel):
    total_score_actual_corr: float | None = None
    indicator_weights: list[StockIndicatorWeightItem] | None = None


class StockCorrEntryResponse(BaseModel):
    id: int
    report_id: int
    asset_id: int | None = None
    symbol: str
    name: str | None = None
    total_score_actual_corr: float | None = None
    indicator_weights: list[dict] | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Asset Role ────────────────────────────────────────────────────────────────

class AssetRoleCreate(BaseModel):
    name: str
    code: str
    applicable_types: list[str] | None = None   # ["stock", "etf", "fund", "index"]
    description: str | None = None
    color: str | None = None                     # hex color e.g. "#6366f1"
    display_order: int = 0
    is_active: bool = True


class AssetRoleUpdate(BaseModel):
    name: str | None = None
    applicable_types: list[str] | None = None
    description: str | None = None
    color: str | None = None
    display_order: int | None = None
    is_active: bool | None = None


class AssetRoleResponse(BaseModel):
    id: int
    name: str
    code: str
    applicable_types: list[str] | None = None
    description: str | None = None
    color: str | None = None
    display_order: int
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AssetRoleLinkItem(BaseModel):
    role_id: int
    role_name: str
    role_code: str
    color: str | None = None
