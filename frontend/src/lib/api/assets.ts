import { apiClient } from "@/lib/api/client";

export type AssetDetail = {
  id: number;
  symbol: string;
  name: string;
  market: string;
  asset_type: string;
  industry_id: number | null;
  currency: string;
  is_penny_stock: boolean;
  is_active: boolean;
  data_sync_enabled: boolean;
  last_price_synced_at: string | null;
  created_at?: string;
};

export type AssetPrice = {
  id: number;
  asset_id: number;
  trade_date: string;
  open_price: number | string;
  high_price: number | string;
  low_price: number | string;
  close_price: number | string;
  volume: number | string;
  created_at?: string;
};

export type AssetScore = {
  id: number;
  asset_id: number;
  trade_date: string;
  market_score: number | string;
  industry_score: number | string;
  factor_score: number | string;
  price_level_score: number | string;
  fundamental_score: number | string | null;
  sentiment_score: number | string | null;
  industry_momentum_version: string | null;
  final_score: number | string;
  rating: "strong_buy" | "buy" | "watch" | "weak" | "avoid" | string;
  scoring_version: string;
  created_at: string;
};

export type SwingSetup = {
  id: number;
  asset_id: number;
  trade_date: string;
  current_price: number | string;
  entry_zone_low: number | string;
  entry_zone_high: number | string;
  add_zone_1: number | string;
  add_zone_2: number | string;
  stop_loss_price: number | string;
  target_price_1: number | string;
  target_price_2: number | string;
  expected_holding_days: number;
  swing_score: number | string;
  confidence_level: "low" | "medium" | "high" | string;
  setup_type: "pullback" | "breakout" | "trend_follow" | "mean_reversion" | string;
  reason: string;
  created_at: string;
};

export type FundamentalReport = {
  id: number;
  asset_id: number;
  report_year: number;
  report_quarter: number;
  revenue: number | string;
  revenue_yoy_percent: number | string;
  revenue_qoq_percent: number | string;
  gross_profit: number | string;
  operating_income: number | string;
  net_income: number | string;
  eps: number | string;
  gross_margin: number | string;
  operating_margin: number | string;
  net_margin: number | string;
  roe: number | string;
  roa: number | string;
  debt_ratio: number | string;
  current_ratio: number | string;
  operating_cash_flow: number | string;
  free_cash_flow: number | string;
  created_at: string;
};

export type FundamentalScore = {
  id: number;
  asset_id: number;
  report_year: number;
  report_quarter: number;
  growth_score: number | string;
  profitability_score: number | string;
  financial_health_score: number | string;
  cashflow_score: number | string;
  fundamental_score: number | string;
  fundamental_rating: "excellent" | "good" | "normal" | "weak" | "poor" | string;
  created_at: string;
};

export type NewsArticle = {
  id: number;
  title: string;
  source: string;
  url: string | null;
  published_at: string;
  summary: string;
  asset_id: number | null;
  industry_id: number | null;
  market: string | null;
  topic_tags: string | null;
  sentiment_label: "positive" | "neutral" | "negative" | string;
  sentiment_score: number | string;
  impact_score: number | string;
  freshness_score: number | string;
  weighted_news_score: number | string;
  created_at: string;
};

export type TechnicalIndicator = {
  id: number;
  asset_id: number;
  trade_date: string;
  ma5: number | string | null;
  ma10: number | string | null;
  ma20: number | string | null;
  ma60: number | string | null;
  rsi14: number | string | null;
  volume_ma5: number | string | null;
  volume_ratio: number | string | null;
  change_percent: number | string | null;
  is_uptrend: boolean;
  is_overbought: boolean;
  is_volume_spike: boolean;
  created_at: string;
};

export type PriceLevel = {
  id: number;
  asset_id: number;
  trade_date: string;
  current_price: number | string;
  high_52w: number | string;
  low_52w: number | string;
  percentile_52w: number | string;
  high_all_time: number | string;
  low_all_time: number | string;
  percentile_all_time: number | string;
  level_52w: string;
  level_all_time: string;
  created_at: string;
};

export async function getAsset(assetId: number) {
  const response = await apiClient.get<AssetDetail>(`/assets/${assetId}`);
  return response.data;
}

export async function getAssetPrices(assetId: number, startDate: string, endDate: string) {
  const response = await apiClient.get<AssetPrice[]>(`/assets/${assetId}/prices`, {
    params: {
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    },
  });
  return response.data;
}

export async function getLatestAssetScore(assetId: number) {
  const response = await apiClient.get<AssetScore>(`/assets/${assetId}/score/latest`);
  return response.data;
}

export async function getLatestSwingSetup(assetId: number) {
  const response = await apiClient.get<SwingSetup>(`/assets/${assetId}/swing-setup/latest`);
  return response.data;
}

export async function generateSwingSetup(assetId: number) {
  const response = await apiClient.post<SwingSetup>(`/assets/${assetId}/swing-setup/generate`);
  return response.data;
}

export async function getFundamentalReports(assetId: number) {
  const response = await apiClient.get<FundamentalReport[]>(`/assets/${assetId}/fundamentals`);
  return response.data;
}

export async function getLatestFundamentalScore(assetId: number) {
  const response = await apiClient.get<FundamentalScore>(
    `/assets/${assetId}/fundamentals/scores/latest`,
  );
  return response.data;
}

export async function getAssetNews(assetId: number) {
  const response = await apiClient.get<NewsArticle[]>("/news", {
    params: { asset_id: assetId },
  });
  return response.data;
}

export async function getTechnicalIndicators(assetId: number) {
  const response = await apiClient.get<TechnicalIndicator[]>(
    `/assets/${assetId}/indicators`,
  );
  return response.data;
}

export async function getLatestPriceLevel(assetId: number) {
  const response = await apiClient.get<PriceLevel>(`/assets/${assetId}/price-levels/latest`);
  return response.data;
}
