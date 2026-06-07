"use client";

import { AxiosError } from "axios";
import { create } from "zustand";

import { Asset, getAssets, IndustryFilter, MarketFilter } from "@/lib/api/watchlist";
import {
  generateSwingSetup,
  getLatestSwingSetup,
  getSwingRanking,
  getSwingSetups,
  SwingConfidence,
  SwingSetup,
  SwingSetupType,
} from "@/lib/api/swing";

export type ConfidenceFilter = "ALL" | SwingConfidence;
export type SetupTypeFilter = "ALL" | SwingSetupType;

type SwingState = {
  assets: Asset[];
  swingSetups: SwingSetup[];
  selectedSetup: SwingSetup | null;
  marketFilter: MarketFilter;
  industryFilter: IndustryFilter;
  confidenceFilter: ConfidenceFilter;
  setupTypeFilter: SetupTypeFilter;
  isLoading: boolean;
  error: string | null;
  fetchSwingSetups: () => Promise<void>;
  fetchSwingRanking: () => Promise<void>;
  fetchLatestSwingSetup: (assetId: number) => Promise<void>;
  generateSwingSetup: (assetId: number) => Promise<void>;
  setSelectedSetup: (setup: SwingSetup | null) => void;
  setMarketFilter: (market: MarketFilter) => void;
  setIndustryFilter: (industry: IndustryFilter) => void;
  setConfidenceFilter: (confidence: ConfidenceFilter) => void;
  setSetupTypeFilter: (setupType: SetupTypeFilter) => void;
  clearError: () => void;
};

function errorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (error.response?.status === 401) return "尚未登入或登入已過期。";
    if (error.response?.status === 404) return "尚無波段交易資料。";
    if (error.response?.status === 400) return "尚無價格、技術指標或評分資料。";
  }
  return "操作失敗，請稍後再試。";
}

export const useSwingStore = create<SwingState>((set, get) => ({
  assets: [],
  swingSetups: [],
  selectedSetup: null,
  marketFilter: "ALL",
  industryFilter: "ALL",
  confidenceFilter: "ALL",
  setupTypeFilter: "ALL",
  isLoading: false,
  error: null,

  fetchSwingSetups: async () => {
    set({ isLoading: true, error: null });
    try {
      const [assets, swingSetups] = await Promise.all([getAssets(), getSwingSetups()]);
      set({ assets, swingSetups });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSwingRanking: async () => {
    set({ isLoading: true, error: null });
    try {
      const [assets, swingSetups] = await Promise.all([getAssets(), getSwingRanking()]);
      set({ assets, swingSetups });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchLatestSwingSetup: async (assetId) => {
    set({ isLoading: true, error: null });
    try {
      const selectedSetup = await getLatestSwingSetup(assetId);
      set({ selectedSetup });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  generateSwingSetup: async (assetId) => {
    set({ isLoading: true, error: null });
    try {
      const selectedSetup = await generateSwingSetup(assetId);
      const [assets, swingSetups] = await Promise.all([getAssets(), getSwingSetups()]);
      set({ assets, swingSetups, selectedSetup });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedSetup: (selectedSetup) => set({ selectedSetup }),
  setMarketFilter: (marketFilter) => set({ marketFilter }),
  setIndustryFilter: (industryFilter) => set({ industryFilter }),
  setConfidenceFilter: (confidenceFilter) => set({ confidenceFilter }),
  setSetupTypeFilter: (setupTypeFilter) => set({ setupTypeFilter }),
  clearError: () => set({ error: null }),
}));
