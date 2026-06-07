"use client";

import { AxiosError } from "axios";
import { create } from "zustand";

import { getDashboardSummary } from "@/lib/api/dashboard";
import type { DashboardSummary } from "@/lib/api/dashboard";

type DashboardState = {
  summary: DashboardSummary | null;
  isLoading: boolean;
  error: string | null;
  fetchDashboardSummary: () => Promise<void>;
  clearError: () => void;
};

function errorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    if (error.response?.status === 401) return "尚未登入或登入已過期。";
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return "Dashboard 資料載入失敗，請稍後再試。";
}

export const useDashboardStore = create<DashboardState>((set) => ({
  summary: null,
  isLoading: false,
  error: null,

  fetchDashboardSummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const summary = await getDashboardSummary();
      set({ summary });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
