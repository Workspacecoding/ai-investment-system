import { apiClient } from "@/lib/api/client";

type Asset = {
  id: number;
  symbol: string;
  name: string;
};

type PaperPortfolio = {
  id: number;
  realized_pnl: number | string;
  created_at: string;
};

export type RiskLevel = "conservative" | "balanced" | "aggressive";

export type UserGoal = {
  id: number;
  user_id: number;
  current_capital: number | string;
  target_capital: number | string;
  target_date: string;
  created_at: string;
};

export type GoalInput = {
  current_capital: number;
  target_capital: number;
  target_date: string;
  risk_level: RiskLevel;
  allow_crypto: boolean;
  allow_penny_stock: boolean;
};

export type GoalStrategy = {
  id: number;
  user_id: number;
  goal_id: number;
  current_capital: number | string;
  target_capital: number | string;
  target_date: string;
  required_annual_return: number | string;
  required_monthly_return: number | string;
  strategy_type: string;
  risk_level: string;
  etf_ratio: number | string;
  stock_ratio: number | string;
  crypto_ratio: number | string;
  cash_ratio: number | string;
  probability_score: number | string;
  created_at: string;
};

export type GoalStrategyRecommendation = {
  id: number;
  goal_strategy_id: number;
  asset_id: number;
  symbol: string;
  name: string;
  recommendation_type: "core" | "growth" | "aggressive" | string;
  allocation_percent: number;
  reason: string;
  created_at: string;
};

export type ProfitAllocation = {
  id: number;
  user_id: number;
  portfolio_id: number;
  realized_profit: number | string;
  entertainment_amount: number | string;
  reinvest_amount: number | string;
  cash_amount: number | string;
  core_asset_amount: number | string;
  entertainment_ratio: number | string;
  reinvest_ratio: number | string;
  cash_ratio: number | string;
  core_asset_ratio: number | string;
  allocation_version: string;
  created_at: string;
};

export type ProfitAllocationRecommendation = {
  id: number;
  allocation_id: number;
  asset_id: number;
  symbol: string;
  name: string;
  recommendation_type: string;
  allocation_amount: number;
  reason: string;
  created_at: string;
};

function num(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function safe<T>(request: Promise<T>, fallback: T) {
  try {
    return await request;
  } catch {
    return fallback;
  }
}

async function getAssets() {
  const response = await apiClient.get<Asset[]>("/assets");
  return response.data;
}

async function getPaperPortfolios() {
  const response = await apiClient.get<PaperPortfolio[]>("/paper-portfolios");
  return response.data;
}

function latestPortfolio(portfolios: PaperPortfolio[]) {
  return [...portfolios].sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
}

async function withAssetNames<T extends { asset_id: number }>(items: T[]) {
  const assets = await safe(getAssets(), []);
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  return items.map((item) => {
    const asset = assetsById.get(item.asset_id);
    return {
      ...item,
      symbol: asset?.symbol ?? String(item.asset_id),
      name: asset?.name ?? "-",
    };
  });
}

export async function getGoals() {
  const response = await apiClient.get<UserGoal[]>("/goals");
  return response.data;
}

export async function createGoal(input: GoalInput) {
  const [goalResponse] = await Promise.all([
    apiClient.post<UserGoal>("/goals", {
      current_capital: input.current_capital,
      target_capital: input.target_capital,
      target_date: input.target_date,
    }),
    apiClient.put("/settings", {
      risk_level: input.risk_level,
      allow_crypto: input.allow_crypto,
      allow_penny_stock: input.allow_penny_stock,
    }),
  ]);
  return goalResponse.data;
}

export async function updateGoal(goalId: number, input: GoalInput) {
  const [goalResponse] = await Promise.all([
    apiClient.put<UserGoal>(`/goals/${goalId}`, {
      current_capital: input.current_capital,
      target_capital: input.target_capital,
      target_date: input.target_date,
    }),
    apiClient.put("/settings", {
      risk_level: input.risk_level,
      allow_crypto: input.allow_crypto,
      allow_penny_stock: input.allow_penny_stock,
    }),
  ]);
  return goalResponse.data;
}

export async function getLatestGoalStrategy() {
  const response = await apiClient.get<GoalStrategy>("/goal-strategies/latest");
  return response.data;
}

export async function generateGoalStrategy() {
  const response = await apiClient.post<GoalStrategy>("/goal-strategies/generate");
  return response.data;
}

export async function getGoalStrategyRecommendations(strategyId: number) {
  const response = await apiClient.get<
    Array<Omit<GoalStrategyRecommendation, "symbol" | "name">>
  >(`/goal-strategies/${strategyId}/recommendations`);
  return withAssetNames(response.data);
}

export async function getLatestProfitAllocation() {
  const response = await apiClient.get<ProfitAllocation>("/profit-allocations/latest");
  return response.data;
}

export async function generateProfitAllocation() {
  const portfolios = await getPaperPortfolios();
  const portfolio = latestPortfolio(portfolios);
  const realizedProfit = num(portfolio?.realized_pnl);

  if (!portfolio || realizedProfit <= 0) {
    throw new Error("目前尚無可分配的已實現獲利。");
  }

  const response = await apiClient.post<ProfitAllocation>("/profit-allocations/generate", {
    portfolio_id: portfolio.id,
    realized_profit: realizedProfit,
  });
  return response.data;
}

export async function getProfitAllocationRecommendations(allocationId: number) {
  const response = await apiClient.get<
    Array<Omit<ProfitAllocationRecommendation, "symbol" | "name">>
  >(`/profit-allocations/${allocationId}/recommendations`);
  return withAssetNames(response.data);
}
