import { apiClient } from "@/lib/api/client";

// ── Types ─────────────────────────────────────────────────────────────────

export type MarketConfig = {
  id: number;
  code: string;
  name: string;
  currency: string;
  description: string | null;
  is_active: boolean;
  is_tracked: boolean;
  display_order: number;
  created_at: string;
};

export type IndustryRow = {
  id: number;
  industry_code: string;
  industry_name: string;
  market: string;
  description: string | null;
  tracking_status: "core" | "observation" | "disabled";
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

export async function updateMarket(id: number, p: Partial<{ name: string; currency: string; description: string; is_active: boolean; is_tracked: boolean; display_order: number }>): Promise<MarketConfig> {
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

export async function updateIndustry(id: number, p: Partial<{ industry_name: string; market: string; description: string; tracking_status: string }>): Promise<IndustryRow> {
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
}>): Promise<AssetRow> {
  return (await apiClient.put<AssetRow>(`/admin/assets/${id}`, p)).data;
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
  created_at: string;
};

export async function listIndicatorConfigs(): Promise<MarketIndicatorConfig[]> {
  return (await apiClient.get<MarketIndicatorConfig[]>("/admin/indicator-configs")).data;
}

export async function createIndicatorConfig(p: {
  field_key: string; display_name: string; unit: string;
  description?: string | null; formula?: string | null;
  display_order?: number; is_active?: boolean;
}): Promise<MarketIndicatorConfig> {
  return (await apiClient.post<MarketIndicatorConfig>("/admin/indicator-configs", p)).data;
}

export async function updateIndicatorConfig(id: number, p: Partial<{
  display_name: string; unit: string; description: string | null;
  formula: string | null; is_active: boolean; display_order: number;
  api_config_id: number | null; api_source: string | null;
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
  field_key: string;
  display_name: string;
  weight: number;
  is_active: boolean;
  use_in_calc: boolean;
  display_order: number;
};

export async function listScoreFormulas(formula_type?: string): Promise<ScoreFormula[]> {
  return (await apiClient.get<ScoreFormula[]>("/admin/score-formulas", { params: formula_type ? { formula_type } : {} })).data;
}

export async function createScoreFormula(p: Omit<ScoreFormula, "id">): Promise<ScoreFormula> {
  return (await apiClient.post<ScoreFormula>("/admin/score-formulas", p)).data;
}

export async function updateScoreFormula(id: number, p: Partial<Pick<ScoreFormula, "display_name" | "weight" | "is_active" | "use_in_calc" | "display_order">>): Promise<ScoreFormula> {
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
