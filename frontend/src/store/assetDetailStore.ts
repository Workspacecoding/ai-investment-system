"use client";

import { AxiosError } from "axios";
import { create } from "zustand";

import {
  AssetDetail,
  AssetPrice,
  AssetScore,
  FundamentalReport,
  FundamentalScore,
  generateSwingSetup,
  getAsset,
  getAssetNews,
  getAssetPrices,
  getFundamentalReports,
  getLatestAssetScore,
  getLatestFundamentalScore,
  getLatestPriceLevel,
  getLatestSwingSetup,
  getTechnicalIndicators,
  NewsArticle,
  PriceLevel,
  SwingSetup,
  TechnicalIndicator,
} from "@/lib/api/assets";
import { getWatchlist } from "@/lib/api/watchlist";

type AssetDetailState = {
  asset: AssetDetail | null;
  prices: AssetPrice[];
  latestScore: AssetScore | null;
  latestSwingSetup: SwingSetup | null;
  fundamentals: FundamentalReport[];
  latestFundamentalScore: FundamentalScore | null;
  news: NewsArticle[];
  technicalIndicators: TechnicalIndicator[];
  latestPriceLevel: PriceLevel | null;
  isInWatchlist: boolean;
  startDate: string;
  endDate: string;
  isLoading: boolean;
  error: string | null;
  fetchAssetDetail: (assetId: number) => Promise<void>;
  fetchPrices: (assetId: number, startDate?: string, endDate?: string) => Promise<void>;
  generateSwingSetup: (assetId: number) => Promise<void>;
  setDateRange: (startDate: string, endDate: string) => void;
  clearAssetDetail: () => void;
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

async function safe<T>(request: Promise<T>, fallback: T) {
  try {
    return await request;
  } catch {
    return fallback;
  }
}

function errorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    if (error.response?.status === 404) return "找不到該股票資料。";
    if (error.response?.status === 401) return "尚未登入或登入已過期。";
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return "資料載入失敗，請稍後再試。";
}

const initialState = {
  asset: null,
  prices: [],
  latestScore: null,
  latestSwingSetup: null,
  fundamentals: [],
  latestFundamentalScore: null,
  news: [],
  technicalIndicators: [],
  latestPriceLevel: null,
  isInWatchlist: false,
};

export const useAssetDetailStore = create<AssetDetailState>((set, get) => ({
  ...initialState,
  startDate: oneYearAgo(),
  endDate: today(),
  isLoading: false,
  error: null,

  fetchAssetDetail: async (assetId) => {
    set({ isLoading: true, error: null });
    try {
      const { startDate, endDate } = get();
      const asset = await getAsset(assetId);
      const [
        prices,
        latestScore,
        latestSwingSetup,
        fundamentals,
        latestFundamentalScore,
        news,
        technicalIndicators,
        latestPriceLevel,
        watchlist,
      ] = await Promise.all([
        safe(getAssetPrices(assetId, startDate, endDate), []),
        safe<AssetScore | null>(getLatestAssetScore(assetId), null),
        safe<SwingSetup | null>(getLatestSwingSetup(assetId), null),
        safe(getFundamentalReports(assetId), []),
        safe<FundamentalScore | null>(getLatestFundamentalScore(assetId), null),
        safe(getAssetNews(assetId), []),
        safe(getTechnicalIndicators(assetId), []),
        safe<PriceLevel | null>(getLatestPriceLevel(assetId), null),
        safe(getWatchlist(), []),
      ]);

      set({
        asset,
        prices,
        latestScore,
        latestSwingSetup,
        fundamentals,
        latestFundamentalScore,
        news,
        technicalIndicators,
        latestPriceLevel,
        isInWatchlist: watchlist.some((item) => item.asset_id === assetId),
      });
    } catch (error) {
      set({ ...initialState, error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPrices: async (assetId, startDate, endDate) => {
    const nextStartDate = startDate ?? get().startDate;
    const nextEndDate = endDate ?? get().endDate;
    set({ isLoading: true, error: null });
    try {
      const prices = await getAssetPrices(assetId, nextStartDate, nextEndDate);
      set({ prices, startDate: nextStartDate, endDate: nextEndDate });
    } catch (error) {
      set({ error: errorMessage(error), prices: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  generateSwingSetup: async (assetId) => {
    set({ isLoading: true, error: null });
    try {
      const latestSwingSetup = await generateSwingSetup(assetId);
      set({ latestSwingSetup });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  setDateRange: (startDate, endDate) => set({ startDate, endDate }),
  clearAssetDetail: () => set({ ...initialState, error: null }),
  clearError: () => set({ error: null }),
}));
