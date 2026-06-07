import { apiClient } from "@/lib/api/client";

type PaperPortfolio = {
  id: number;
  user_id: number;
  name: string;
  initial_cash: number | string;
  cash_balance: number | string;
  total_market_value: number | string;
  total_equity: number | string;
  realized_pnl: number | string;
  unrealized_pnl: number | string;
  created_at: string;
};

type PaperPosition = {
  id: number;
  portfolio_id: number;
  asset_id: number;
  quantity: number | string;
  avg_cost: number | string;
  current_price: number | string;
  market_value: number | string;
  unrealized_pnl: number | string;
  unrealized_pnl_percent: number | string;
  created_at: string;
};

type Asset = {
  id: number;
  symbol: string;
  name: string;
  market: string;
  asset_type: string;
  industry_id: number | null;
  currency: string;
  is_penny_stock: boolean;
  is_active: boolean;
};

type Industry = {
  id: number;
  industry_code: string;
  industry_name: string;
  market: string;
};

type PerformanceReport = {
  id: number;
  portfolio_id: number;
  report_year: number;
  report_month: number;
  total_return_percent: number | string;
};

type PortfolioOptimization = {
  id: number;
  portfolio_name: string;
  market_state: string;
  strategy_type: string;
  risk_level: string;
  total_capital: number | string;
  expected_return: number | string;
  expected_risk: number | string;
  expected_sharpe: number | string;
  created_at: string;
};

type PortfolioOptimizationAsset = {
  id: number;
  optimization_id: number;
  asset_id: number;
  allocation_percent: number | string;
  allocation_amount: number | string;
  asset_score: number | string;
  recommendation_type: string;
};

type GoalStrategy = {
  id: number;
  current_capital: number | string;
  target_capital: number | string;
  target_date: string;
  probability_score: number | string;
  strategy_type: string;
};

export type PortfolioSummary = {
  portfolio_id: number | null;
  portfolio_name: string;
  total_value: number;
  total_cost: number;
  unrealized_pnl: number;
  return_percent: number;
  monthly_return: number;
};

export type PortfolioHolding = {
  asset_id: number;
  symbol: string;
  name: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  return_percent: number;
  industry: string;
  weight_percent: number;
};

export type PortfolioAllocationItem = {
  name: "ETF" | "Stock" | "Cash" | "Crypto";
  value: number;
  percent: number;
};

export type IndustryExposureItem = {
  name: string;
  value: number;
  percent: number;
};

export type PortfolioOptimizationView = {
  id: number;
  portfolio_name: string;
  market_state: string;
  strategy_type: string;
  risk_level: string;
  expected_return: number;
  expected_risk: number;
  expected_sharpe: number;
  assets: Array<{
    asset_id: number;
    symbol: string;
    name: string;
    current_percent: number;
    target_percent: number;
    difference: number;
    recommendation: string;
  }>;
};

export type GoalProgress = {
  current_value: number;
  target_value: number;
  progress_percent: number;
  estimated_target_date: string | null;
  probability_score: number;
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

async function getPaperPortfolios() {
  const response = await apiClient.get<PaperPortfolio[]>("/paper-portfolios");
  return response.data;
}

async function getPositions(portfolioId: number) {
  const response = await apiClient.get<PaperPosition[]>(
    `/paper-portfolios/${portfolioId}/positions`,
  );
  return response.data;
}

async function getReports(portfolioId: number) {
  const response = await apiClient.get<PerformanceReport[]>(
    `/paper-portfolios/${portfolioId}/reports`,
  );
  return response.data;
}

async function getAssets() {
  const response = await apiClient.get<Asset[]>("/assets");
  return response.data;
}

async function getIndustries() {
  const response = await apiClient.get<Industry[]>("/industries");
  return response.data;
}

async function getLatestOptimization() {
  const response = await apiClient.get<PortfolioOptimization>(
    "/portfolio-optimizations/latest",
  );
  return response.data;
}

async function getOptimizationAssets(optimizationId: number) {
  const response = await apiClient.get<PortfolioOptimizationAsset[]>(
    `/portfolio-optimizations/${optimizationId}/assets`,
  );
  return response.data;
}

async function getLatestGoalStrategy() {
  const response = await apiClient.get<GoalStrategy>("/goal-strategies/latest");
  return response.data;
}

function latestPortfolio(portfolios: PaperPortfolio[]) {
  return [...portfolios].sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
}

function latestReport(reports: PerformanceReport[]) {
  return [...reports].sort((left, right) => {
    if (right.report_year !== left.report_year) return right.report_year - left.report_year;
    return right.report_month - left.report_month;
  })[0];
}

function assetTypeName(assetType: string): PortfolioAllocationItem["name"] {
  if (assetType === "etf") return "ETF";
  if (assetType === "crypto") return "Crypto";
  return "Stock";
}

async function getPortfolioContext() {
  const portfolios = await getPaperPortfolios();
  const portfolio = latestPortfolio(portfolios);
  const [assets, industries] = await Promise.all([getAssets(), getIndustries()]);

  if (!portfolio) {
    return { portfolio: null, positions: [], assets, industries, reports: [] };
  }

  const [positions, reports] = await Promise.all([
    getPositions(portfolio.id),
    safe(getReports(portfolio.id), []),
  ]);

  return { portfolio, positions, assets, industries, reports };
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const { portfolio, positions, reports } = await getPortfolioContext();
  if (!portfolio) {
    return {
      portfolio_id: null,
      portfolio_name: "",
      total_value: 0,
      total_cost: 0,
      unrealized_pnl: 0,
      return_percent: 0,
      monthly_return: 0,
    };
  }

  const totalCost = positions.reduce(
    (sum, position) => sum + num(position.avg_cost) * num(position.quantity),
    0,
  );
  const unrealizedPnl = num(portfolio.unrealized_pnl);
  const report = latestReport(reports);

  return {
    portfolio_id: portfolio.id,
    portfolio_name: portfolio.name,
    total_value: num(portfolio.total_equity),
    total_cost: totalCost,
    unrealized_pnl: unrealizedPnl,
    return_percent: totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0,
    monthly_return: num(report?.total_return_percent),
  };
}

export async function getPortfolioHoldings(): Promise<PortfolioHolding[]> {
  const { portfolio, positions, assets, industries } = await getPortfolioContext();
  if (!portfolio) return [];

  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const industriesById = new Map(industries.map((industry) => [industry.id, industry]));
  const totalMarketValue = positions.reduce(
    (sum, position) => sum + num(position.market_value),
    0,
  );

  return positions.map((position) => {
    const asset = assetsById.get(position.asset_id);
    const industry = asset?.industry_id ? industriesById.get(asset.industry_id) : null;
    const marketValue = num(position.market_value);
    const cost = num(position.avg_cost) * num(position.quantity);

    return {
      asset_id: position.asset_id,
      symbol: asset?.symbol ?? String(position.asset_id),
      name: asset?.name ?? "-",
      quantity: num(position.quantity),
      avg_cost: num(position.avg_cost),
      current_price: num(position.current_price),
      market_value: marketValue,
      unrealized_pnl: num(position.unrealized_pnl),
      return_percent: cost > 0 ? (num(position.unrealized_pnl) / cost) * 100 : 0,
      industry: industry?.industry_name ?? "Others",
      weight_percent: totalMarketValue > 0 ? (marketValue / totalMarketValue) * 100 : 0,
    };
  });
}

export async function getPortfolioAllocation(): Promise<PortfolioAllocationItem[]> {
  const { portfolio, positions, assets } = await getPortfolioContext();
  if (!portfolio) return [];

  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const buckets = new Map<PortfolioAllocationItem["name"], number>([
    ["ETF", 0],
    ["Stock", 0],
    ["Cash", num(portfolio.cash_balance)],
    ["Crypto", 0],
  ]);

  positions.forEach((position) => {
    const asset = assetsById.get(position.asset_id);
    const name = assetTypeName(asset?.asset_type ?? "stock");
    buckets.set(name, (buckets.get(name) ?? 0) + num(position.market_value));
  });

  const total = [...buckets.values()].reduce((sum, value) => sum + value, 0);
  return [...buckets.entries()].map(([name, value]) => ({
    name,
    value,
    percent: total > 0 ? (value / total) * 100 : 0,
  }));
}

export async function getIndustryExposure(): Promise<IndustryExposureItem[]> {
  const holdings = await getPortfolioHoldings();
  const buckets = new Map<string, number>();

  holdings.forEach((holding) => {
    buckets.set(holding.industry, (buckets.get(holding.industry) ?? 0) + holding.market_value);
  });

  const total = [...buckets.values()].reduce((sum, value) => sum + value, 0);
  return [...buckets.entries()].map(([name, value]) => ({
    name,
    value,
    percent: total > 0 ? (value / total) * 100 : 0,
  }));
}

export async function getLatestPortfolioOptimization(): Promise<PortfolioOptimizationView | null> {
  const optimization = await safe<PortfolioOptimization | null>(getLatestOptimization(), null);
  if (!optimization) return null;

  const [optimizationAssets, holdings, assets] = await Promise.all([
    getOptimizationAssets(optimization.id),
    getPortfolioHoldings(),
    getAssets(),
  ]);
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const holdingsByAssetId = new Map(holdings.map((holding) => [holding.asset_id, holding]));

  return {
    id: optimization.id,
    portfolio_name: optimization.portfolio_name,
    market_state: optimization.market_state,
    strategy_type: optimization.strategy_type,
    risk_level: optimization.risk_level,
    expected_return: num(optimization.expected_return),
    expected_risk: num(optimization.expected_risk),
    expected_sharpe: num(optimization.expected_sharpe),
    assets: optimizationAssets.map((item) => {
      const asset = assetsById.get(item.asset_id);
      const holding = holdingsByAssetId.get(item.asset_id);
      const target = num(item.allocation_percent);
      const current = holding?.weight_percent ?? 0;
      return {
        asset_id: item.asset_id,
        symbol: asset?.symbol ?? String(item.asset_id),
        name: asset?.name ?? "-",
        current_percent: current,
        target_percent: target,
        difference: target - current,
        recommendation: item.recommendation_type,
      };
    }),
  };
}

export async function getGoalProgress(): Promise<GoalProgress | null> {
  const goalStrategy = await safe<GoalStrategy | null>(getLatestGoalStrategy(), null);
  if (!goalStrategy) return null;

  const summary = await getPortfolioSummary();
  const currentValue = summary.total_value || num(goalStrategy.current_capital);
  const targetValue = num(goalStrategy.target_capital);

  return {
    current_value: currentValue,
    target_value: targetValue,
    progress_percent: targetValue > 0 ? (currentValue / targetValue) * 100 : 0,
    estimated_target_date: goalStrategy.target_date,
    probability_score: num(goalStrategy.probability_score),
  };
}
