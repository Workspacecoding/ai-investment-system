"use client";

import { AxiosError } from "axios";
import { create } from "zustand";

import {
  createGoal,
  generateGoalStrategy,
  generateProfitAllocation,
  getGoals,
  getGoalStrategyRecommendations,
  getLatestGoalStrategy,
  getLatestProfitAllocation,
  getProfitAllocationRecommendations,
  updateGoal,
} from "@/lib/api/goals";
import type {
  GoalInput,
  GoalStrategy,
  GoalStrategyRecommendation,
  ProfitAllocation,
  ProfitAllocationRecommendation,
  UserGoal,
} from "@/lib/api/goals";

type GoalState = {
  goals: UserGoal[];
  selectedGoal: UserGoal | null;
  latestStrategy: GoalStrategy | null;
  strategyRecommendations: GoalStrategyRecommendation[];
  latestProfitAllocation: ProfitAllocation | null;
  profitAllocationRecommendations: ProfitAllocationRecommendation[];
  isLoading: boolean;
  error: string | null;
  fetchGoals: () => Promise<void>;
  createGoal: (input: GoalInput) => Promise<void>;
  updateGoal: (goalId: number, input: GoalInput) => Promise<void>;
  generateStrategy: () => Promise<void>;
  fetchLatestStrategy: () => Promise<void>;
  fetchStrategyRecommendations: (strategyId?: number) => Promise<void>;
  generateProfitAllocation: () => Promise<void>;
  fetchLatestProfitAllocation: () => Promise<void>;
  fetchProfitAllocationRecommendations: (allocationId?: number) => Promise<void>;
  setSelectedGoal: (goal: UserGoal | null) => void;
  clearError: () => void;
};

function errorMessage(error: unknown) {
  if (error instanceof Error && !(error instanceof AxiosError)) return error.message;
  if (error instanceof AxiosError) {
    if (error.response?.status === 401) return "尚未登入或登入已過期。";
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return "目標規劃資料處理失敗，請稍後再試。";
}

function newestGoal(goals: UserGoal[]) {
  return [...goals].sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  selectedGoal: null,
  latestStrategy: null,
  strategyRecommendations: [],
  latestProfitAllocation: null,
  profitAllocationRecommendations: [],
  isLoading: false,
  error: null,

  fetchGoals: async () => {
    set({ isLoading: true, error: null });
    try {
      const goals = await getGoals();
      set({ goals, selectedGoal: newestGoal(goals) ?? null });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  createGoal: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const selectedGoal = await createGoal(input);
      const goals = await getGoals();
      set({ goals, selectedGoal });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateGoal: async (goalId, input) => {
    set({ isLoading: true, error: null });
    try {
      const selectedGoal = await updateGoal(goalId, input);
      const goals = await getGoals();
      set({ goals, selectedGoal });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  generateStrategy: async () => {
    set({ isLoading: true, error: null });
    try {
      const latestStrategy = await generateGoalStrategy();
      const strategyRecommendations = await getGoalStrategyRecommendations(latestStrategy.id);
      set({ latestStrategy, strategyRecommendations });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchLatestStrategy: async () => {
    set({ isLoading: true, error: null });
    try {
      const latestStrategy = await getLatestGoalStrategy();
      const strategyRecommendations = await getGoalStrategyRecommendations(latestStrategy.id);
      set({ latestStrategy, strategyRecommendations });
    } catch {
      set({ latestStrategy: null, strategyRecommendations: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchStrategyRecommendations: async (strategyId) => {
    const targetId = strategyId ?? get().latestStrategy?.id;
    if (!targetId) return;
    set({ isLoading: true, error: null });
    try {
      const strategyRecommendations = await getGoalStrategyRecommendations(targetId);
      set({ strategyRecommendations });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  generateProfitAllocation: async () => {
    set({ isLoading: true, error: null });
    try {
      const latestProfitAllocation = await generateProfitAllocation();
      const profitAllocationRecommendations = await getProfitAllocationRecommendations(
        latestProfitAllocation.id,
      );
      set({ latestProfitAllocation, profitAllocationRecommendations });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchLatestProfitAllocation: async () => {
    set({ isLoading: true, error: null });
    try {
      const latestProfitAllocation = await getLatestProfitAllocation();
      const profitAllocationRecommendations = await getProfitAllocationRecommendations(
        latestProfitAllocation.id,
      );
      set({ latestProfitAllocation, profitAllocationRecommendations });
    } catch {
      set({ latestProfitAllocation: null, profitAllocationRecommendations: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProfitAllocationRecommendations: async (allocationId) => {
    const targetId = allocationId ?? get().latestProfitAllocation?.id;
    if (!targetId) return;
    set({ isLoading: true, error: null });
    try {
      const profitAllocationRecommendations = await getProfitAllocationRecommendations(targetId);
      set({ profitAllocationRecommendations });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedGoal: (selectedGoal) => set({ selectedGoal }),
  clearError: () => set({ error: null }),
}));
