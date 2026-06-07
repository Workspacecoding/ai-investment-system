"use client";

import { AxiosError } from "axios";
import { create } from "zustand";

import {
  getGoalProgress,
  getIndustryExposure,
  getLatestPortfolioOptimization,
  getPortfolioAllocation,
  getPortfolioHoldings,
  getPortfolioSummary,
  GoalProgress,
  IndustryExposureItem,
  PortfolioAllocationItem,
  PortfolioHolding,
  PortfolioOptimizationView,
  PortfolioSummary,
} from "@/lib/api/portfolio";

type PortfolioState = {
  summary: PortfolioSummary | null;
  holdings: PortfolioHolding[];
  allocation: PortfolioAllocationItem[];
  industryExposure: IndustryExposureItem[];
  optimization: PortfolioOptimizationView | null;
  goalProgress: GoalProgress | null;
  isLoading: boolean;
  error: string | null;
  fetchPortfolioData: () => Promise<void>;
  clearError: () => void;
};

function errorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    if (error.response?.status === 401) return "尚未登入或登入已過期。";
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return "投資組合資料載入失敗，請稍後再試。";
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  summary: null,
  holdings: [],
  allocation: [],
  industryExposure: [],
  optimization: null,
  goalProgress: null,
  isLoading: false,
  error: null,

  fetchPortfolioData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [summary, holdings, allocation, industryExposure, optimization, goalProgress] =
        await Promise.all([
          getPortfolioSummary(),
          getPortfolioHoldings(),
          getPortfolioAllocation(),
          getIndustryExposure(),
          getLatestPortfolioOptimization(),
          getGoalProgress(),
        ]);

      set({
        summary,
        holdings,
        allocation,
        industryExposure,
        optimization,
        goalProgress,
      });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
