import { apiClient } from "@/lib/api/client";

export type MarketFilter = "ALL" | "TW" | "US";
export type IndustryFilter =
  | "ALL"
  | "AI"
  | "ELECTRONICS"
  | "SEMICONDUCTOR"
  | "CLOUD"
  | "DATACENTER";

export type Asset = {
  id: number;
  symbol: string;
  name: string;
  market: string;
  asset_type: "stock" | "etf" | "crypto" | string;
  industry_id: number | null;
  currency: string;
  is_penny_stock: boolean;
  is_active: boolean;
  data_sync_enabled: boolean;
  last_price_synced_at: string | null;
  created_at?: string;
};

export type AssetCreatePayload = {
  symbol: string;
  name: string;
  market: "TW" | "US";
  asset_type?: "stock" | "etf";
  industry_id?: number | null;
  currency?: string;
  is_penny_stock?: boolean;
  is_active?: boolean;
};

export type WatchlistItem = {
  id: number;
  user_id: number;
  asset_id: number;
  note: string | null;
  is_sync_enabled: boolean;
  sync_start_date: string | null;
  sync_end_date: string | null;
  last_synced_at: string | null;
  created_at: string;
};

export type WatchlistSyncResult = WatchlistItem & {
  inserted_count: number;
  skipped_duplicate_count: number;
  warning_count: number;
  start_date: string;
  end_date: string;
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
};

export type GetAssetsParams = {
  market?: string;
  asset_type?: string;
  industry_id?: number;
  is_penny_stock?: boolean;
  is_active?: boolean;
};

export async function getAssets(params: GetAssetsParams = {}) {
  const response = await apiClient.get<Asset[]>("/assets", { params });
  return response.data;
}

export async function createAsset(payload: AssetCreatePayload) {
  const response = await apiClient.post<Asset>("/assets", {
    asset_type: "stock",
    industry_id: null,
    currency: payload.market === "TW" ? "TWD" : "USD",
    is_penny_stock: false,
    is_active: true,
    ...payload,
    symbol: payload.symbol.trim().toUpperCase(),
    name: payload.name.trim() || payload.symbol.trim().toUpperCase(),
  });
  return response.data;
}

export async function addToWatchlist(assetId: number) {
  const response = await apiClient.post<WatchlistItem>("/watchlist", {
    asset_id: assetId,
  });
  return response.data;
}

export async function removeFromWatchlist(assetId: number) {
  await apiClient.delete(`/watchlist/${assetId}`);
}

export async function getWatchlist() {
  const response = await apiClient.get<WatchlistItem[]>("/watchlist");
  return response.data;
}

export async function startWatchlistSync(assetId: number) {
  const response = await apiClient.post<WatchlistSyncResult>(
    `/watchlist/${assetId}/sync/start`,
  );
  return response.data;
}

export async function stopWatchlistSync(assetId: number) {
  const response = await apiClient.post<WatchlistItem>(`/watchlist/${assetId}/sync/stop`);
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
