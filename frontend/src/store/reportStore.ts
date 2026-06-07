"use client";

import { AxiosError } from "axios";
import { create } from "zustand";

import {
  generateMonthlyReport as generateMonthlyReportRequest,
  getBacktestTrades,
  getBacktests,
  getFactorRanking,
  getLatestMonthlyReport,
  getMonthlyReports,
  getPaperPortfolios,
  getReportAssets,
  getReportIndustries,
  getStrategyPerformance,
  getTradeLogs,
} from "@/lib/api/reports";
import type {
  AssetLookup,
  BacktestRun,
  BacktestTrade,
  FactorRanking,
  IndustryLookup,
  MonthlyReport,
  PaperPortfolio,
  PaperTradeLog,
  StrategyPerformance,
} from "@/lib/api/reports";

type ReportState = {
  portfolios: PaperPortfolio[];
  assets: AssetLookup[];
  industries: IndustryLookup[];
  monthlyReports: MonthlyReport[];
  latestMonthlyReport: MonthlyReport | null;
  strategyPerformance: StrategyPerformance[];
  backtests: BacktestRun[];
  selectedBacktestTrades: BacktestTrade[];
  selectedBacktestId: number | null;
  factorRanking: FactorRanking[];
  tradeLogs: PaperTradeLog[];
  selectedYear: number;
  selectedMonth: number;
  selectedPortfolioId: number | null;
  isLoading: boolean;
  error: string | null;
  fetchInitialData: () => Promise<void>;
  fetchMonthlyReports: () => Promise<void>;
  generateMonthlyReport: () => Promise<void>;
  fetchLatestMonthlyReport: () => Promise<void>;
  fetchStrategyPerformance: () => Promise<void>;
  fetchBacktests: () => Promise<void>;
  fetchBacktestTrades: (backtestRunId: number) => Promise<void>;
  fetchFactorRanking: () => Promise<void>;
  fetchTradeLogs: () => Promise<void>;
  setDateFilter: (year: number, month: number) => void;
  setPortfolioId: (portfolioId: number | null) => void;
  clearError: () => void;
};

function currentYear() {
  return new Date().getFullYear();
}

function currentMonth() {
  return new Date().getMonth() + 1;
}

function errorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      return "尚未登入或登入已過期。";
    }
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return "Reports Center 資料載入失敗，請稍後再試。";
}

async function safe<T>(request: Promise<T>, fallback: T) {
  try {
    return await request;
  } catch {
    return fallback;
  }
}

export const useReportStore = create<ReportState>((set, get) => ({
  portfolios: [],
  assets: [],
  industries: [],
  monthlyReports: [],
  latestMonthlyReport: null,
  strategyPerformance: [],
  backtests: [],
  selectedBacktestTrades: [],
  selectedBacktestId: null,
  factorRanking: [],
  tradeLogs: [],
  selectedYear: currentYear(),
  selectedMonth: currentMonth(),
  selectedPortfolioId: null,
  isLoading: false,
  error: null,

  fetchInitialData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [portfolios, assets, industries, backtests, factorRanking] = await Promise.all([
        getPaperPortfolios(),
        safe(getReportAssets(), []),
        safe(getReportIndustries(), []),
        safe(getBacktests(), []),
        safe(getFactorRanking(), []),
      ]);
      const selectedPortfolioId = get().selectedPortfolioId ?? portfolios[0]?.id ?? null;
      set({ portfolios, assets, industries, backtests, factorRanking, selectedPortfolioId });

      if (selectedPortfolioId) {
        const [monthlyReports, latestMonthlyReport, strategyPerformance, tradeLogs] =
          await Promise.all([
            safe(getMonthlyReports(selectedPortfolioId), []),
            safe<MonthlyReport | null>(getLatestMonthlyReport(selectedPortfolioId), null),
            safe(getStrategyPerformance(selectedPortfolioId), []),
            safe(getTradeLogs(selectedPortfolioId), []),
          ]);
        set({ monthlyReports, latestMonthlyReport, strategyPerformance, tradeLogs });
      }
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMonthlyReports: async () => {
    const portfolioId = get().selectedPortfolioId;
    if (!portfolioId) return;
    set({ isLoading: true, error: null });
    try {
      const monthlyReports = await getMonthlyReports(portfolioId);
      set({ monthlyReports });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  generateMonthlyReport: async () => {
    const portfolioId = get().selectedPortfolioId;
    if (!portfolioId) return;
    set({ isLoading: true, error: null });
    try {
      const report = await generateMonthlyReportRequest(
        portfolioId,
        get().selectedYear,
        get().selectedMonth,
      );
      const [monthlyReports, latestMonthlyReport, strategyPerformance, tradeLogs] =
        await Promise.all([
          getMonthlyReports(portfolioId),
          safe<MonthlyReport | null>(getLatestMonthlyReport(portfolioId), report),
          safe(getStrategyPerformance(portfolioId), []),
          safe(getTradeLogs(portfolioId), []),
        ]);
      set({ monthlyReports, latestMonthlyReport, strategyPerformance, tradeLogs });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchLatestMonthlyReport: async () => {
    const portfolioId = get().selectedPortfolioId;
    if (!portfolioId) return;
    set({ isLoading: true, error: null });
    try {
      const latestMonthlyReport = await getLatestMonthlyReport(portfolioId);
      set({ latestMonthlyReport });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchStrategyPerformance: async () => {
    const portfolioId = get().selectedPortfolioId;
    if (!portfolioId) return;
    set({ isLoading: true, error: null });
    try {
      const strategyPerformance = await getStrategyPerformance(portfolioId);
      set({ strategyPerformance });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchBacktests: async () => {
    set({ isLoading: true, error: null });
    try {
      const backtests = await getBacktests();
      set({ backtests });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchBacktestTrades: async (backtestRunId) => {
    set({ isLoading: true, error: null, selectedBacktestId: backtestRunId });
    try {
      const selectedBacktestTrades = await getBacktestTrades(backtestRunId);
      set({ selectedBacktestTrades });
    } catch (error) {
      set({ error: errorMessage(error), selectedBacktestTrades: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchFactorRanking: async () => {
    set({ isLoading: true, error: null });
    try {
      const factorRanking = await getFactorRanking();
      set({ factorRanking });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTradeLogs: async () => {
    const portfolioId = get().selectedPortfolioId;
    if (!portfolioId) return;
    set({ isLoading: true, error: null });
    try {
      const tradeLogs = await getTradeLogs(portfolioId);
      set({ tradeLogs });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  setDateFilter: (selectedYear, selectedMonth) => set({ selectedYear, selectedMonth }),
  setPortfolioId: (selectedPortfolioId) => {
    set({
      selectedPortfolioId,
      monthlyReports: [],
      latestMonthlyReport: null,
      strategyPerformance: [],
      tradeLogs: [],
    });
    if (selectedPortfolioId) {
      get().fetchMonthlyReports();
      get().fetchLatestMonthlyReport();
      get().fetchStrategyPerformance();
      get().fetchTradeLogs();
    }
  },
  clearError: () => set({ error: null }),
}));
