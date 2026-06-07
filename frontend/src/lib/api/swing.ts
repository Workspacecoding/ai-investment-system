import { apiClient } from "@/lib/api/client";

export type SwingConfidence = "low" | "medium" | "high";
export type SwingSetupType = "pullback" | "breakout" | "trend_follow" | "mean_reversion";

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
  confidence_level: SwingConfidence;
  setup_type: SwingSetupType;
  reason: string;
  created_at: string;
};

export type SwingQueryParams = {
  market?: string;
  industry?: string;
  confidence?: string;
  setup_type?: string;
};

export async function getSwingSetups(params: SwingQueryParams = {}) {
  const response = await apiClient.get<SwingSetup[]>("/swing-setups", { params });
  return response.data;
}

export async function getSwingRanking(params: SwingQueryParams = {}) {
  const response = await apiClient.get<SwingSetup[]>("/swing-setups/ranking", { params });
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
