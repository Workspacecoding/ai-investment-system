"use client";

import { AxiosError } from "axios";
import { create } from "zustand";

import {
  addToWatchlist,
  Asset,
  AssetPrice,
  createAsset,
  getAssetPrices,
  getAssets,
  getWatchlist,
  IndustryFilter,
  MarketFilter,
  removeFromWatchlist,
  startWatchlistSync,
  stopWatchlistSync,
  WatchlistItem,
} from "@/lib/api/watchlist";

type AddAssetInput = {
  market: string;
  symbol: string;
  name: string;
  industry_id: number | null;
};

type WatchlistState = {
  assets: Asset[];
  watchlist: WatchlistItem[];
  selectedAsset: Asset | null;
  priceHistory: AssetPrice[];
  marketFilter: MarketFilter;
  industryFilter: IndustryFilter;
  startDate: string;
  endDate: string;
  isLoading: boolean;
  error: string | null;
  lastSyncSummary: string | null;
  fetchAssets: () => Promise<void>;
  fetchWatchlist: () => Promise<void>;
  addAsset: (input: AddAssetInput) => Promise<void>;
  removeAsset: (assetId: number) => Promise<void>;
  startSync: (assetId: number) => Promise<void>;
  stopSync: (assetId: number) => Promise<void>;
  fetchPriceHistory: (assetId?: number) => Promise<void>;
  setMarketFilter: (marketFilter: MarketFilter) => void;
  setIndustryFilter: (industryFilter: IndustryFilter) => void;
  setDateRange: (startDate: string, endDate: string) => void;
  setSelectedAsset: (asset: Asset | null) => void;
  clearError: () => void;
};

function oneYearAgo() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function errorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (error.response?.status === 401) return "登入已過期，請重新登入。";
    if (error.response?.status === 409 || error.response?.status === 400) {
      return "股票已存在或資料格式不正確。";
    }
  }
  return "操作失敗，請稍後再試。";
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  assets: [],
  watchlist: [],
  selectedAsset: null,
  priceHistory: [],
  marketFilter: "ALL",
  industryFilter: "ALL",
  startDate: oneYearAgo(),
  endDate: today(),
  isLoading: false,
  error: null,
  lastSyncSummary: null,

  fetchAssets: async () => {
    const { marketFilter } = get();
    set({ isLoading: true, error: null });
    try {
      const assets = await getAssets({
        market: marketFilter === "ALL" ? undefined : marketFilter,
        is_active: true,
      });
      set({ assets });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchWatchlist: async () => {
    set({ isLoading: true, error: null });
    try {
      const [assets, watchlist] = await Promise.all([
        getAssets({
          market: get().marketFilter === "ALL" ? undefined : get().marketFilter,
          is_active: true,
        }),
        getWatchlist(),
      ]);
      set({ assets, watchlist });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  addAsset: async (input) => {
    const symbol = normalizeSymbol(input.symbol);
    set({ isLoading: true, error: null });
    try {
      let assets = await getAssets({
        market: input.market === "ALL" ? undefined : input.market,
        is_active: true,
      });
      let asset = assets.find(
        (candidate) =>
          candidate.symbol.toUpperCase() === symbol && candidate.market === input.market,
      );

      if (!asset) {
        asset = await createAsset({
          market: input.market,
          symbol,
          name: input.name,
          industry_id: input.industry_id ?? null,
          currency: input.market === "TW" ? "TWD" : "USD",
        });
      }

      await addToWatchlist(asset.id);
      const watchlist = await getWatchlist();
      assets = await getAssets({
        market: get().marketFilter === "ALL" ? undefined : get().marketFilter,
        is_active: true,
      });
      set({ assets, watchlist });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  removeAsset: async (assetId) => {
    set({ isLoading: true, error: null, lastSyncSummary: null });
    try {
      await removeFromWatchlist(assetId);
      const watchlist = await getWatchlist();
      const selectedAsset = get().selectedAsset;
      set({
        watchlist,
        selectedAsset: selectedAsset?.id === assetId ? null : selectedAsset,
        priceHistory: selectedAsset?.id === assetId ? [] : get().priceHistory,
      });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  startSync: async (assetId) => {
    set({ isLoading: true, error: null, lastSyncSummary: null });
    try {
      const result = await startWatchlistSync(assetId);
      const [assets, watchlist] = await Promise.all([getAssets(), getWatchlist()]);
      set({
        assets,
        watchlist,
        lastSyncSummary: `新增 ${result.inserted_count} 筆，重複跳過 ${result.skipped_duplicate_count} 筆，警告 ${result.warning_count} 筆。`,
      });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  stopSync: async (assetId) => {
    set({ isLoading: true, error: null, lastSyncSummary: null });
    try {
      await stopWatchlistSync(assetId);
      const [assets, watchlist] = await Promise.all([getAssets(), getWatchlist()]);
      set({ assets, watchlist });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPriceHistory: async (assetId) => {
    const targetAssetId = assetId ?? get().selectedAsset?.id;
    if (!targetAssetId) return;

    set({ isLoading: true, error: null });
    try {
      const priceHistory = await getAssetPrices(targetAssetId, get().startDate, get().endDate);
      const selectedAsset =
        get().assets.find((asset) => asset.id === targetAssetId) ?? get().selectedAsset;
      set({ priceHistory, selectedAsset });
    } catch (error) {
      set({ error: errorMessage(error), priceHistory: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  setMarketFilter: (marketFilter) => set({ marketFilter }),
  setIndustryFilter: (industryFilter) => set({ industryFilter }),
  setDateRange: (startDate, endDate) => set({ startDate, endDate }),
  setSelectedAsset: (selectedAsset) => set({ selectedAsset }),
  clearError: () => set({ error: null }),
}));
