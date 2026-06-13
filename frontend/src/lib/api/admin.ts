import { apiClient } from "@/lib/api/client";

// ── Types ─────────────────────────────────────────────────────────────────

export type AnalysisModel = {
  id: number;
  name: string;
  version: string;
  scope_type: "market" | "industry" | "asset";
  market_code: string | null;
  source_id: number | null;
  description: string | null;
  status: "active" | "testing" | "disabled";
  formula_snapshot: Record<string, unknown> | null;
  validation_snapshot: Record<string, unknown> | null;
  created_at: string;
};

export type MarketConfig = {
  id: number;
  code: string;
  name: string;
  currency: string;
  description: string | null;
  is_active: boolean;
  is_tracked: boolean;
  display_order: number;
  current_model_id: number | null;
  module_calc_indicator_ids: number[] | null;
  module_validation_asset_ids: number[] | null;
  module_validation_indicator_ids: number[] | null;
  module_validation_period_days: number | null;
  module_result_indicator_ids: number[] | null;
  module_formula_expr: string | null;
  module_validation_conditions: string | null;
  crawler_enabled: boolean;
  crawler_start_time: string | null;
  crawler_stop_time: string | null;
  crawler_years: number;
  created_at: string;
};

export type IndustryRow = {
  id: number;
  industry_code: string;
  industry_name: string;
  market: string;
  description: string | null;
  tracking_status: "core" | "observation" | "disabled";
  current_model_id: number | null;
  module_calc_indicator_ids: number[] | null;
  module_validation_asset_ids: number[] | null;
  module_validation_indicator_ids: number[] | null;
  module_validation_period_days: number | null;
  module_result_indicator_ids: number[] | null;
  module_formula_expr: string | null;
  module_validation_conditions: string | null;
  crawler_enabled: boolean;
  crawler_start_time: string | null;
  crawler_stop_time: string | null;
  crawler_years: number;
  created_at: string;
};

export type AssetRow = {
  id: number;
  symbol: string;
  name: string;
  market: string;
  asset_type: string;
  industry_id: number | null;
  api_config_id: number | null;
  api_code: string | null;
  description: string | null;
  currency: string;
  update_frequency: string | null;
  in_swing_pool: boolean;
  in_newsletter: boolean;
  needs_backtest: boolean;
  is_penny_stock: boolean;
  is_active: boolean;
  data_sync_enabled: boolean;
  current_model_id: number | null;
  position_model_id: number | null;
  analysis_model_id: number | null;
  crawler_enabled: boolean;
  crawler_start_time: string | null;
  crawler_stop_time: string | null;
  crawler_indicator_ids: number[] | null;
  crawler_years: number;
  module_calc_indicator_ids: number[] | null;
  module_validation_asset_ids: number[] | null;
  module_validation_indicator_ids: number[] | null;
  module_validation_period_days: number | null;
  module_result_indicator_ids: number[] | null;
  module_formula_expr: string | null;
  module_validation_conditions: string | null;
  created_at: string;
};

export type AssetRole = {
  id: number;
  name: string;
  code: string;
  applicable_types: string[] | null;
  description: string | null;
  color: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
};

export type AssetRoleLinkItem = {
  role_id: number;
  role_name: string;
  role_code: string;
  color: string | null;
};

export type SwingRecommendation = {
  asset_id: number;
  symbol: string;
  name: string;
  market: string;
  asset_type: string;
  currency: string;
  industry_id: number | null;
  industry_name: string | null;
  in_swing_pool: boolean;
  in_newsletter: boolean;
  roles: AssetRoleLinkItem[];
  stock_score: number;
  industry_score: number;
  market_score: number;
  momentum_score: number;
  swing_score: number;
  label: string;
};

export type AssetListResponse = { total: number; items: AssetRow[] };

export type SymbolLookup = {
  symbol: string;
  name: string | null;
  long_name: string | null;
  market: string;
  asset_type: string | null;
  currency: string | null;
  found: boolean;
};

export type BulkImportResponse = { created: number; skipped: number; errors: string[] };

// ── Symbol lookup ─────────────────────────────────────────────────────────

export async function lookupSymbol(symbol: string, market: string): Promise<SymbolLookup> {
  const res = await apiClient.get<SymbolLookup>("/admin/symbol-lookup", {
    params: { symbol, market },
  });
  return res.data;
}

// ── Markets ───────────────────────────────────────────────────────────────

/** Public endpoint (no auth) — use for dropdowns in non-admin pages */
export async function listMarketsPublic(): Promise<MarketConfig[]> {
  return (await apiClient.get<MarketConfig[]>("/market/markets")).data;
}

/** Admin endpoint (requires auth) — use in admin panel */
export async function listMarkets(): Promise<MarketConfig[]> {
  return (await apiClient.get<MarketConfig[]>("/admin/markets")).data;
}

export async function createMarket(p: { code: string; name: string; currency: string; description?: string }): Promise<MarketConfig> {
  return (await apiClient.post<MarketConfig>("/admin/markets", p)).data;
}

export async function updateMarket(id: number, p: Partial<{ name: string; currency: string; description: string; is_active: boolean; is_tracked: boolean; display_order: number; current_model_id: number | null; module_calc_indicator_ids: number[] | null; module_validation_asset_ids: number[] | null; module_validation_indicator_ids: number[] | null; module_validation_period_days: number | null; module_result_indicator_ids: number[] | null; module_formula_expr: string | null; module_validation_conditions: string | null }>): Promise<MarketConfig> {
  return (await apiClient.put<MarketConfig>(`/admin/markets/${id}`, p)).data;
}

export async function reorderMarket(id: number, direction: "up" | "down"): Promise<MarketConfig[]> {
  return (await apiClient.post<MarketConfig[]>(`/admin/markets/${id}/reorder`, null, { params: { direction } })).data;
}

export async function deleteMarket(id: number): Promise<void> {
  await apiClient.delete(`/admin/markets/${id}`);
}

// ── Industries ────────────────────────────────────────────────────────────

/** Public endpoint (no auth) — use for dropdowns in non-admin pages */
export async function listIndustriesPublic(): Promise<IndustryRow[]> {
  return (await apiClient.get<IndustryRow[]>("/market/industries")).data;
}

/** Admin endpoint (requires auth) — use in admin panel */
export async function listAdminIndustries(): Promise<IndustryRow[]> {
  return (await apiClient.get<IndustryRow[]>("/admin/industries")).data;
}

export async function createIndustry(p: { industry_code: string; industry_name: string; market: string; description?: string }): Promise<IndustryRow> {
  return (await apiClient.post<IndustryRow>("/admin/industries", p)).data;
}

export async function updateIndustry(id: number, p: Partial<{ industry_name: string; market: string; description: string; tracking_status: string; current_model_id: number | null; module_calc_indicator_ids: number[] | null; module_validation_asset_ids: number[] | null; module_validation_indicator_ids: number[] | null; module_validation_period_days: number | null; module_result_indicator_ids: number[] | null; module_formula_expr: string | null; module_validation_conditions: string | null }>): Promise<IndustryRow> {
  return (await apiClient.put<IndustryRow>(`/admin/industries/${id}`, p)).data;
}

export async function deleteIndustry(id: number): Promise<void> {
  await apiClient.delete(`/admin/industries/${id}`);
}

// ── Assets ────────────────────────────────────────────────────────────────

export async function listAdminAssets(params?: {
  search?: string; market?: string; asset_type?: string;
  industry_id?: number; is_active?: boolean; skip?: number; limit?: number;
}): Promise<AssetListResponse> {
  return (await apiClient.get<AssetListResponse>("/admin/assets", { params })).data;
}

export async function createAdminAsset(p: {
  symbol: string; name: string; market: string; asset_type: string;
  currency: string; industry_id?: number; api_config_id?: number | null;
  api_code?: string | null; description?: string | null;
  update_frequency?: string | null;
  in_swing_pool?: boolean; in_newsletter?: boolean; needs_backtest?: boolean;
  is_penny_stock?: boolean;
}): Promise<AssetRow> {
  return (await apiClient.post<AssetRow>("/admin/assets", p)).data;
}

export async function updateAdminAsset(id: number, p: Partial<{
  name: string; market: string; asset_type: string;
  industry_id: number | null; api_config_id: number | null;
  api_code: string | null; description: string | null; currency: string;
  update_frequency: string | null;
  in_swing_pool: boolean; in_newsletter: boolean; needs_backtest: boolean;
  is_penny_stock: boolean; is_active: boolean;
  current_model_id: number | null;
  position_model_id: number | null;
  analysis_model_id: number | null;
  module_calc_indicator_ids: number[] | null;
  module_validation_asset_ids: number[] | null;
  module_validation_indicator_ids: number[] | null;
  module_validation_period_days: number | null;
  module_result_indicator_ids: number[] | null;
  module_formula_expr: string | null;
  module_validation_conditions: string | null;
}>): Promise<AssetRow> {
  return (await apiClient.put<AssetRow>(`/admin/assets/${id}`, p)).data;
}

// ── Analysis Models ───────────────────────────────────────────────────────────

export async function listAnalysisModels(): Promise<AnalysisModel[]> {
  return (await apiClient.get<AnalysisModel[]>("/admin/analysis-models")).data;
}

export async function createAnalysisModel(p: {
  name: string; version: string; scope_type: string;
  market_code?: string | null; source_id?: number | null;
  description?: string | null; status?: string;
  formula_snapshot?: Record<string, unknown> | null;
  validation_snapshot?: Record<string, unknown> | null;
}): Promise<AnalysisModel> {
  return (await apiClient.post<AnalysisModel>("/admin/analysis-models", p)).data;
}

export async function updateAnalysisModel(id: number, p: Partial<{
  name: string; version: string; scope_type: string;
  market_code: string | null; description: string | null; status: string;
}>): Promise<AnalysisModel> {
  return (await apiClient.put<AnalysisModel>(`/admin/analysis-models/${id}`, p)).data;
}

export async function deleteAnalysisModel(id: number): Promise<void> {
  await apiClient.delete(`/admin/analysis-models/${id}`);
}

export async function deleteAdminAsset(id: number): Promise<void> {
  await apiClient.delete(`/admin/assets/${id}`);
}

export async function bulkImportAssets(items: Omit<AssetRow, "id" | "data_sync_enabled" | "created_at">[]): Promise<BulkImportResponse> {
  return (await apiClient.post<BulkImportResponse>("/admin/assets/bulk-import", items)).data;
}

// ── Market Indicator Configs ──────────────────────────────────────────────────

export type MarketIndicatorConfig = {
  id: number;
  field_key: string;
  display_name: string;
  unit: string;
  description: string | null;
  formula: string | null;
  is_active: boolean;
  display_order: number;
  api_config_id: number | null;
  api_source: string | null;
  indicator_category: string | null;
  created_at: string;
};

export async function listIndicatorConfigs(): Promise<MarketIndicatorConfig[]> {
  return (await apiClient.get<MarketIndicatorConfig[]>("/admin/indicator-configs")).data;
}

export async function createIndicatorConfig(p: {
  field_key: string; display_name: string; unit: string;
  description?: string | null; formula?: string | null;
  display_order?: number; is_active?: boolean;
  indicator_category?: string | null;
}): Promise<MarketIndicatorConfig> {
  return (await apiClient.post<MarketIndicatorConfig>("/admin/indicator-configs", p)).data;
}

export async function updateIndicatorConfig(id: number, p: Partial<{
  display_name: string; unit: string; description: string | null;
  formula: string | null; is_active: boolean; display_order: number;
  api_config_id: number | null; api_source: string | null;
  indicator_category: string | null;
}>): Promise<MarketIndicatorConfig> {
  return (await apiClient.put<MarketIndicatorConfig>(`/admin/indicator-configs/${id}`, p)).data;
}

export async function deleteIndicatorConfig(id: number): Promise<void> {
  await apiClient.delete(`/admin/indicator-configs/${id}`);
}

// ── Tracked Industries ────────────────────────────────────────────────────────

export type TrackedIndustry = {
  id: number;
  industry_id: number;
  industry_name: string;
  industry_code: string;
  market: string;
  created_at: string;
};

export async function listTrackedIndustries(): Promise<TrackedIndustry[]> {
  return (await apiClient.get<TrackedIndustry[]>("/admin/tracked-industries")).data;
}

export async function addTrackedIndustry(industry_id: number): Promise<TrackedIndustry> {
  return (await apiClient.post<TrackedIndustry>("/admin/tracked-industries", { industry_id })).data;
}

export async function removeTrackedIndustry(tracked_id: number): Promise<void> {
  await apiClient.delete(`/admin/tracked-industries/${tracked_id}`);
}

// ── User Admin ────────────────────────────────────────────────────────────────

export type UserAdmin = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
};

export async function listUsersAdmin(): Promise<UserAdmin[]> {
  return (await apiClient.get<UserAdmin[]>("/admin/users")).data;
}

export async function createUserAdmin(p: { email: string; password: string; name?: string; role?: string }): Promise<UserAdmin> {
  return (await apiClient.post<UserAdmin>("/admin/users", p)).data;
}

export async function updateUserAdmin(id: number, p: { role?: string; name?: string; new_password?: string }): Promise<UserAdmin> {
  return (await apiClient.put<UserAdmin>(`/admin/users/${id}`, p)).data;
}

export async function deleteUserAdmin(id: number): Promise<void> {
  await apiClient.delete(`/admin/users/${id}`);
}

// ── Asset Indicator Links ─────────────────────────────────────────────────────

export type AssetIndicatorLink = {
  id: number;
  indicator_config_id: number;
  field_key: string;
  display_name: string;
};

export async function getAssetIndicators(asset_id: number): Promise<AssetIndicatorLink[]> {
  return (await apiClient.get<AssetIndicatorLink[]>(`/admin/assets/${asset_id}/indicators`)).data;
}

export async function setAssetIndicators(asset_id: number, indicator_ids: number[]): Promise<AssetIndicatorLink[]> {
  return (await apiClient.put<AssetIndicatorLink[]>(`/admin/assets/${asset_id}/indicators`, indicator_ids)).data;
}

export async function getIndustryIndicators(industry_id: number): Promise<AssetIndicatorLink[]> {
  return (await apiClient.get<AssetIndicatorLink[]>(`/admin/industries/${industry_id}/indicators`)).data;
}

export async function setIndustryIndicators(industry_id: number, indicator_ids: number[]): Promise<AssetIndicatorLink[]> {
  return (await apiClient.put<AssetIndicatorLink[]>(`/admin/industries/${industry_id}/indicators`, indicator_ids)).data;
}

export async function getMarketIndicators(market_id: number): Promise<AssetIndicatorLink[]> {
  return (await apiClient.get<AssetIndicatorLink[]>(`/admin/markets/${market_id}/indicators`)).data;
}

export async function setMarketIndicators(market_id: number, indicator_ids: number[]): Promise<AssetIndicatorLink[]> {
  return (await apiClient.put<AssetIndicatorLink[]>(`/admin/markets/${market_id}/indicators`, indicator_ids)).data;
}

// ── Score Formulas ────────────────────────────────────────────────────────────

export type ScoreFormula = {
  id: number;
  formula_type: string;
  market_code: string | null;
  field_key: string;
  display_name: string;
  weight: number;
  is_active: boolean;
  use_in_calc: boolean;
  is_reverse: boolean;
  display_order: number;
};

export async function listScoreFormulas(formula_type?: string, market_code?: string | null): Promise<ScoreFormula[]> {
  const params: Record<string, string> = {};
  if (formula_type) params.formula_type = formula_type;
  if (market_code !== undefined && market_code !== null) params.market_code = market_code;
  return (await apiClient.get<ScoreFormula[]>("/admin/score-formulas", { params })).data;
}

export async function createScoreFormula(p: Omit<ScoreFormula, "id">): Promise<ScoreFormula> {
  return (await apiClient.post<ScoreFormula>("/admin/score-formulas", p)).data;
}

export async function updateScoreFormula(id: number, p: Partial<Pick<ScoreFormula, "display_name" | "weight" | "is_active" | "use_in_calc" | "is_reverse" | "display_order" | "market_code">>): Promise<ScoreFormula> {
  return (await apiClient.put<ScoreFormula>(`/admin/score-formulas/${id}`, p)).data;
}

export async function deleteScoreFormula(id: number): Promise<void> {
  await apiClient.delete(`/admin/score-formulas/${id}`);
}

// ── API Configs ───────────────────────────────────────────────────────────────

export type ApiConfig = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  base_url: string | null;
  api_key: string | null;
  extra_params: Record<string, unknown> | null;
  headers: Record<string, unknown> | null;
  is_active: boolean;
  crawl_enabled: boolean;
  crawl_time: string | null;
  created_at: string;
};

export async function listApiConfigs(): Promise<ApiConfig[]> {
  return (await apiClient.get<ApiConfig[]>("/admin/api-configs")).data;
}

export async function createApiConfig(p: Omit<ApiConfig, "id" | "created_at">): Promise<ApiConfig> {
  return (await apiClient.post<ApiConfig>("/admin/api-configs", p)).data;
}

export async function updateApiConfig(id: number, p: Partial<Omit<ApiConfig, "id" | "created_at">>): Promise<ApiConfig> {
  return (await apiClient.put<ApiConfig>(`/admin/api-configs/${id}`, p)).data;
}

export async function deleteApiConfig(id: number): Promise<void> {
  await apiClient.delete(`/admin/api-configs/${id}`);
}

// ── Asset Type Configs ────────────────────────────────────────────────────────

export type AssetTypeConfig = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
};

export async function listAssetTypeConfigs(): Promise<AssetTypeConfig[]> {
  return (await apiClient.get<AssetTypeConfig[]>("/admin/asset-type-configs")).data;
}

export async function createAssetTypeConfig(p: { code: string; name: string; description?: string | null; is_active?: boolean; display_order?: number }): Promise<AssetTypeConfig> {
  return (await apiClient.post<AssetTypeConfig>("/admin/asset-type-configs", p)).data;
}

export async function updateAssetTypeConfig(id: number, p: Partial<{ name: string; description: string | null; is_active: boolean; display_order: number }>): Promise<AssetTypeConfig> {
  return (await apiClient.put<AssetTypeConfig>(`/admin/asset-type-configs/${id}`, p)).data;
}

export async function deleteAssetTypeConfig(id: number): Promise<void> {
  await apiClient.delete(`/admin/asset-type-configs/${id}`);
}

// ── Role Configs ──────────────────────────────────────────────────────────────

export type RoleConfig = {
  id: number;
  name: string;
  label: string;
  description: string | null;
  features: string[] | null;
  is_active: boolean;
  created_at: string;
};

export async function listRoleConfigs(): Promise<RoleConfig[]> {
  return (await apiClient.get<RoleConfig[]>("/admin/role-configs")).data;
}

export async function createRoleConfig(p: { name: string; label: string; description?: string | null; features?: string[]; is_active?: boolean }): Promise<RoleConfig> {
  return (await apiClient.post<RoleConfig>("/admin/role-configs", p)).data;
}

export async function updateRoleConfig(id: number, p: Partial<{ label: string; description: string | null; features: string[]; is_active: boolean }>): Promise<RoleConfig> {
  return (await apiClient.put<RoleConfig>(`/admin/role-configs/${id}`, p)).data;
}

export async function deleteRoleConfig(id: number): Promise<void> {
  await apiClient.delete(`/admin/role-configs/${id}`);
}

// ── Factor Correlation Reports ────────────────────────────────────────────────

export type FactorEntryItem = {
  field_key: string;
  display_name: string;
  weight: number;
  corr_score: number | null;
};

export type FactorCorrReport = {
  id: number;
  report_month: string;
  formula_type: string;
  market_score_actual_corr: number | null;
  factor_entries: FactorEntryItem[] | null;
  notes: string | null;
  created_at: string;
};

export type StockIndicatorWeightItem = {
  field_key: string;
  display_name: string;
  weight: number;
  corr_score: number | null;
};

export type StockCorrEntry = {
  id: number;
  report_id: number;
  asset_id: number | null;
  symbol: string;
  name: string | null;
  total_score_actual_corr: number | null;
  indicator_weights: StockIndicatorWeightItem[] | null;
  created_at: string;
};

export async function listFactorCorrReports(params?: {
  formula_type?: string;
  report_month?: string;
}): Promise<FactorCorrReport[]> {
  return (await apiClient.get<FactorCorrReport[]>("/admin/factor-corr-reports", { params })).data;
}

export async function createFactorCorrReport(p: {
  report_month: string;
  formula_type: string;
  market_score_actual_corr?: number | null;
  factor_entries?: FactorEntryItem[] | null;
  notes?: string | null;
}): Promise<FactorCorrReport> {
  return (await apiClient.post<FactorCorrReport>("/admin/factor-corr-reports", p)).data;
}

export async function updateFactorCorrReport(
  id: number,
  p: Partial<Pick<FactorCorrReport, "market_score_actual_corr" | "factor_entries" | "notes">>
): Promise<FactorCorrReport> {
  return (await apiClient.put<FactorCorrReport>(`/admin/factor-corr-reports/${id}`, p)).data;
}

export async function deleteFactorCorrReport(id: number): Promise<void> {
  await apiClient.delete(`/admin/factor-corr-reports/${id}`);
}

export async function listStockCorrEntries(reportId: number): Promise<StockCorrEntry[]> {
  return (await apiClient.get<StockCorrEntry[]>(`/admin/factor-corr-reports/${reportId}/stocks`)).data;
}

export async function upsertStockCorrEntry(
  reportId: number,
  p: {
    asset_id?: number | null;
    symbol: string;
    name?: string | null;
    total_score_actual_corr?: number | null;
    indicator_weights?: StockIndicatorWeightItem[] | null;
  }
): Promise<StockCorrEntry> {
  return (await apiClient.post<StockCorrEntry>(`/admin/factor-corr-reports/${reportId}/stocks`, p)).data;
}

export async function updateStockCorrEntry(
  reportId: number,
  entryId: number,
  p: { total_score_actual_corr?: number | null; indicator_weights?: StockIndicatorWeightItem[] | null }
): Promise<StockCorrEntry> {
  return (await apiClient.put<StockCorrEntry>(`/admin/factor-corr-reports/${reportId}/stocks/${entryId}`, p)).data;
}

export async function deleteStockCorrEntry(reportId: number, entryId: number): Promise<void> {
  await apiClient.delete(`/admin/factor-corr-reports/${reportId}/stocks/${entryId}`);
}

// ── Asset Roles ───────────────────────────────────────────────────────────────

export async function listAssetRoles(): Promise<AssetRole[]> {
  return (await apiClient.get<AssetRole[]>("/admin/asset-roles")).data;
}

export async function createAssetRole(p: {
  name: string; code: string; applicable_types?: string[] | null;
  description?: string | null; color?: string | null; display_order?: number; is_active?: boolean;
}): Promise<AssetRole> {
  return (await apiClient.post<AssetRole>("/admin/asset-roles", p)).data;
}

export async function updateAssetRole(id: number, p: Partial<{
  name: string; applicable_types: string[] | null; description: string | null;
  color: string | null; display_order: number; is_active: boolean;
}>): Promise<AssetRole> {
  return (await apiClient.put<AssetRole>(`/admin/asset-roles/${id}`, p)).data;
}

export async function deleteAssetRole(id: number): Promise<void> {
  await apiClient.delete(`/admin/asset-roles/${id}`);
}

// ── Asset Role Links ──────────────────────────────────────────────────────────

export async function getAssetRoleLinks(assetId: number): Promise<AssetRoleLinkItem[]> {
  return (await apiClient.get<AssetRoleLinkItem[]>(`/admin/assets/${assetId}/roles`)).data;
}

export async function setAssetRoleLinks(assetId: number, roleIds: number[]): Promise<AssetRoleLinkItem[]> {
  return (await apiClient.put<AssetRoleLinkItem[]>(`/admin/assets/${assetId}/roles`, roleIds)).data;
}

// ── Swing Recommendations ─────────────────────────────────────────────────────

export async function listSwingRecommendations(params?: { user_id?: number; limit?: number }): Promise<SwingRecommendation[]> {
  return (await apiClient.get<SwingRecommendation[]>("/swing-recommend/recommendations", { params })).data;
}

// ── Market Analysis (Phase 1 MVP) ─────────────────────────────────────────────

export type IndicatorDailyValue = {
  id: number;
  record_date: string;
  market_code: string;
  field_key: string;
  display_name: string;
  score: number;
  raw_value: number | null;
  notes: string | null;
};

export type MarketScoreBreakdownItem = {
  field_key: string;
  display_name: string;
  score: number;
  raw_score: number;
  weight: number;
  contribution: number;
  is_reverse: boolean;
};

export type MarketScoreResult = {
  score: number;
  status: string;
  breakdown: MarketScoreBreakdownItem[];
  total_weight: number;
};

export type MarketScoreSnapshot = {
  id: number;
  record_date: string;
  market_code: string;
  score: number;
  status: string;
  breakdown: MarketScoreBreakdownItem[] | null;
  formula_version: string | null;
  future_return_5d: number | null;
  future_return_10d: number | null;
  future_return_20d: number | null;
  is_hit: boolean | null;
};

export type MarketScoreValidation = {
  total: number;
  hit_count: number;
  hit_rate: number;
  avg_error: number | null;
  max_error: number | null;
  correlation: number | null;
};

export async function getIndicatorDailyValues(
  market_code: string,
  record_date?: string,
): Promise<IndicatorDailyValue[]> {
  const params: Record<string, string> = {};
  if (record_date) params.record_date = record_date;
  return (await apiClient.get<IndicatorDailyValue[]>(`/market-analysis/${market_code}/indicator-values`, { params })).data;
}

export async function saveIndicatorDailyValues(
  market_code: string,
  record_date: string,
  values: Omit<IndicatorDailyValue, "id" | "record_date" | "market_code">[],
): Promise<IndicatorDailyValue[]> {
  return (await apiClient.post<IndicatorDailyValue[]>(`/market-analysis/${market_code}/indicator-values`, {
    record_date,
    values,
  })).data;
}

export async function calculateAndSaveMarketScore(
  market_code: string,
  record_date: string,
  save_snapshot = true,
): Promise<MarketScoreResult> {
  return (await apiClient.post<MarketScoreResult>(`/market-analysis/${market_code}/calculate`, {
    record_date,
    save_snapshot,
  })).data;
}

export async function listMarketScoreSnapshots(
  market_code: string,
  limit = 90,
): Promise<MarketScoreSnapshot[]> {
  return (await apiClient.get<MarketScoreSnapshot[]>(`/market-analysis/${market_code}/snapshots`, { params: { limit } })).data;
}

export async function updateSnapshotReturns(
  snapshot_id: number,
  returns: { future_return_5d?: number; future_return_10d?: number; future_return_20d?: number },
): Promise<MarketScoreSnapshot> {
  return (await apiClient.put<MarketScoreSnapshot>(`/market-analysis/snapshots/${snapshot_id}/returns`, returns)).data;
}

export async function getMarketScoreValidation(market_code: string): Promise<MarketScoreValidation> {
  return (await apiClient.get<MarketScoreValidation>(`/market-analysis/${market_code}/validation`)).data;
}

// ── Asset Analysis Config ─────────────────────────────────────────────────────

export type AssetAnalysisConfig = {
  asset_id: number;
  technical_indicators: string[];
  fundamental_indicators: string[];
  chips_indicators: string[];
  applied_models: string[];
  show_technical: boolean;
  show_fundamental: boolean;
  show_chips: boolean;
  show_model_score: boolean;
  show_recommendation: boolean;
  show_risk: boolean;
  show_backtest_summary: boolean;
};

export async function getAssetAnalysisConfig(asset_id: number): Promise<AssetAnalysisConfig> {
  return (await apiClient.get<AssetAnalysisConfig>(`/admin/assets/${asset_id}/analysis-config`)).data;
}

export async function saveAssetAnalysisConfig(asset_id: number, config: Omit<AssetAnalysisConfig, "asset_id">): Promise<AssetAnalysisConfig> {
  return (await apiClient.put<AssetAnalysisConfig>(`/admin/assets/${asset_id}/analysis-config`, config)).data;
}

// ── Asset Data Sync ───────────────────────────────────────────────────────────

export async function startAssetSync(asset_id: number): Promise<{ asset_id: number; data_sync_enabled: boolean }> {
  return (await apiClient.post(`/admin/assets/${asset_id}/sync/start`)).data;
}

export async function pauseAssetSync(asset_id: number): Promise<{ asset_id: number; data_sync_enabled: boolean }> {
  return (await apiClient.post(`/admin/assets/${asset_id}/sync/pause`)).data;
}

export async function deleteAssetPriceData(
  asset_id: number,
  params?: { start_date?: string; end_date?: string },
): Promise<{ asset_id: number; deleted_rows: number }> {
  return (await apiClient.delete(`/admin/assets/${asset_id}/price-data`, { params })).data;
}

// ── Crawler ────────────────────────────────────────────────────────────────

export type AssetDailyDataRow = {
  id: number;
  asset_id: number;
  record_date: string;
  field_key: string;
  display_name: string;
  category: string | null;
  value: number | null;
  raw_text: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
};

export async function startCrawler(assetId: number): Promise<{ crawler_enabled: boolean; crawler_start_time: string }> {
  return (await apiClient.post(`/admin/assets/${assetId}/crawler/start`)).data;
}

export async function stopCrawler(assetId: number): Promise<{ crawler_enabled: boolean; crawler_stop_time: string }> {
  return (await apiClient.post(`/admin/assets/${assetId}/crawler/stop`)).data;
}

export async function updateCrawlerConfig(assetId: number, p: { crawler_indicator_ids?: number[]; crawler_years?: number }): Promise<{ crawler_indicator_ids: number[] | null; crawler_years: number }> {
  return (await apiClient.put(`/admin/assets/${assetId}/crawler/config`, p)).data;
}

export async function listCrawlerData(assetId: number, params?: { skip?: number; limit?: number; field_key?: string }): Promise<{ total: number; items: AssetDailyDataRow[] }> {
  return (await apiClient.get(`/admin/assets/${assetId}/crawler/data`, { params })).data;
}

export async function addCrawlerData(assetId: number, p: { record_date: string; field_key: string; display_name: string; category?: string; value?: number; raw_text?: string; notes?: string }): Promise<AssetDailyDataRow> {
  return (await apiClient.post(`/admin/assets/${assetId}/crawler/data`, p)).data;
}

export async function deleteCrawlerData(assetId: number, recordId: number): Promise<void> {
  await apiClient.delete(`/admin/assets/${assetId}/crawler/data/${recordId}`);
}

// ── Per-indicator Crawler Config ───────────────────────────────────────────

export type AssetCrawlerIndicatorRow = {
  id: number;
  asset_id: number;
  indicator_id: number | null;
  indicator_name: string;
  indicator_type: string | null;
  api_source_id: number | null;
  is_enabled: boolean;
  auto_crawl_enabled: boolean;
  manual_crawl_enabled: boolean;
  crawl_frequency: string | null;
  crawl_time: string | null;
  last_crawled_at: string | null;
  next_crawl_at: string | null;
  last_manual_crawled_at: string | null;
  crawl_status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export async function listCrawlerIndicators(assetId: number): Promise<AssetCrawlerIndicatorRow[]> {
  return (await apiClient.get(`/admin/assets/${assetId}/crawler/indicators`)).data;
}

export async function addCrawlerIndicator(assetId: number, p: {
  indicator_id?: number | null;
  indicator_name: string;
  indicator_type?: string | null;
  api_source_id?: number | null;
  is_enabled?: boolean;
  auto_crawl_enabled?: boolean;
  manual_crawl_enabled?: boolean;
  crawl_frequency?: string | null;
  crawl_time?: string | null;
}): Promise<AssetCrawlerIndicatorRow> {
  return (await apiClient.post(`/admin/assets/${assetId}/crawler/indicators`, p)).data;
}

export async function updateCrawlerIndicator(assetId: number, configId: number, p: Partial<{
  indicator_name: string;
  indicator_type: string | null;
  api_source_id: number | null;
  is_enabled: boolean;
  auto_crawl_enabled: boolean;
  manual_crawl_enabled: boolean;
  crawl_frequency: string | null;
  crawl_time: string | null;
  crawl_status: string;
  error_message: string | null;
}>): Promise<AssetCrawlerIndicatorRow> {
  return (await apiClient.put(`/admin/assets/${assetId}/crawler/indicators/${configId}`, p)).data;
}

export async function deleteCrawlerIndicator(assetId: number, configId: number): Promise<void> {
  await apiClient.delete(`/admin/assets/${assetId}/crawler/indicators/${configId}`);
}

export async function crawlIndicatorNow(assetId: number, configId: number): Promise<AssetCrawlerIndicatorRow> {
  return (await apiClient.post(`/admin/assets/${assetId}/crawler/indicators/${configId}/crawl-now`)).data;
}

export async function stopCrawlerIndicator(assetId: number, configId: number): Promise<AssetCrawlerIndicatorRow> {
  return (await apiClient.post(`/admin/assets/${assetId}/crawler/indicators/${configId}/stop`)).data;
}

// ── Generic Scope Crawler (market / industry) ─────────────────────────────

export type ScopeType = "market" | "industry";

export async function listScopeCrawlerIndicators(scopeType: ScopeType, scopeId: number): Promise<AssetCrawlerIndicatorRow[]> {
  return (await apiClient.get(`/admin/crawler/${scopeType}/${scopeId}/indicators`)).data;
}

export async function addScopeCrawlerIndicator(scopeType: ScopeType, scopeId: number, p: {
  indicator_id?: number | null;
  indicator_name: string;
  indicator_type?: string | null;
  api_source_id?: number | null;
  is_enabled?: boolean;
  auto_crawl_enabled?: boolean;
  manual_crawl_enabled?: boolean;
  crawl_frequency?: string | null;
  crawl_time?: string | null;
}): Promise<AssetCrawlerIndicatorRow> {
  return (await apiClient.post(`/admin/crawler/${scopeType}/${scopeId}/indicators`, p)).data;
}

export async function updateScopeCrawlerIndicator(scopeType: ScopeType, scopeId: number, configId: number, p: Partial<{
  is_enabled: boolean;
  auto_crawl_enabled: boolean;
  manual_crawl_enabled: boolean;
  crawl_frequency: string | null;
  crawl_time: string | null;
  api_source_id: number | null;
  crawl_status: string;
  error_message: string | null;
}>): Promise<AssetCrawlerIndicatorRow> {
  return (await apiClient.put(`/admin/crawler/${scopeType}/${scopeId}/indicators/${configId}`, p)).data;
}

export async function deleteScopeCrawlerIndicator(scopeType: ScopeType, scopeId: number, configId: number): Promise<void> {
  await apiClient.delete(`/admin/crawler/${scopeType}/${scopeId}/indicators/${configId}`);
}

export async function crawlScopeIndicatorNow(scopeType: ScopeType, scopeId: number, configId: number): Promise<AssetCrawlerIndicatorRow> {
  return (await apiClient.post(`/admin/crawler/${scopeType}/${scopeId}/indicators/${configId}/crawl-now`)).data;
}

export async function stopScopeCrawlerIndicator(scopeType: ScopeType, scopeId: number, configId: number): Promise<AssetCrawlerIndicatorRow> {
  return (await apiClient.post(`/admin/crawler/${scopeType}/${scopeId}/indicators/${configId}/stop`)).data;
}

export async function startScopeCrawler(scopeType: ScopeType, scopeId: number): Promise<{ crawler_enabled: boolean; crawler_start_time: string }> {
  return (await apiClient.post(`/admin/crawler/${scopeType}/${scopeId}/start`)).data;
}

export async function stopScopeCrawler(scopeType: ScopeType, scopeId: number): Promise<{ crawler_enabled: boolean; crawler_stop_time: string }> {
  return (await apiClient.post(`/admin/crawler/${scopeType}/${scopeId}/stop`)).data;
}

export async function updateScopeCrawlerConfig(scopeType: ScopeType, scopeId: number, p: { crawler_years?: number }): Promise<{ crawler_years: number }> {
  return (await apiClient.put(`/admin/crawler/${scopeType}/${scopeId}/config`, p)).data;
}
