import { apiClient } from "@/lib/api/client";

export type PaperPortfolio = {
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

export type MonthlyReport = {
  id: number;
  portfolio_id: number;
  report_year: number;
  report_month: number;
  initial_equity: number | string;
  ending_equity: number | string;
  total_return_percent: number | string;
  realized_pnl: number | string;
  unrealized_pnl: number | string;
  total_trades: number;
  win_trades: number;
  lose_trades: number;
  win_rate: number | string;
  max_drawdown: number | string;
  best_asset_id: number | null;
  worst_asset_id: number | null;
  created_at: string;
};

export type StrategyPerformance = {
  id: number;
  portfolio_id: number;
  strategy_type: string;
  total_trades: number;
  win_rate: number | string;
  avg_profit_percent: number | string;
  avg_loss_percent: number | string;
  net_return_percent: number | string;
  created_at: string;
};

export type BacktestRun = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  market: string | null;
  strategy_type: string;
  initial_capital: number | string;
  final_capital: number | string;
  total_return_percent: number | string;
  max_drawdown: number | string;
  win_rate: number | string;
  total_trades: number;
  profit_factor: number | string;
  created_at: string;
};

export type BacktestTrade = {
  id: number;
  backtest_run_id: number;
  asset_id: number;
  strategy_type: string;
  entry_date: string;
  exit_date: string;
  entry_price: number | string;
  exit_price: number | string;
  quantity: number | string;
  pnl: number | string;
  pnl_percent: number | string;
  holding_days: number;
  created_at: string;
};

export type FactorRanking = {
  id: number;
  factor_name: string;
  factor_type: string;
  industry_id: number | null;
  market: string | null;
  start_date: string;
  end_date: string;
  total_signals: number;
  win_rate: number | string;
  avg_return_percent: number | string;
  max_drawdown: number | string;
  profit_factor: number | string;
  factor_rank: number | null;
  created_at: string;
};

export type PaperTradeLog = {
  id: number;
  portfolio_id: number;
  asset_id: number;
  buy_order_id: number | null;
  sell_order_id: number | null;
  realized_pnl: number | string;
  realized_pnl_percent: number | string;
  holding_days: number;
  strategy_type: string | null;
  created_at: string;
};

export type AssetLookup = {
  id: number;
  symbol: string;
  name: string;
  market: string;
  industry_id: number | null;
};

export type IndustryLookup = {
  id: number;
  industry_code: string;
  industry_name: string;
  market: string;
};

export async function getPaperPortfolios() {
  const response = await apiClient.get<PaperPortfolio[]>("/paper-portfolios");
  return response.data;
}

export async function getMonthlyReports(portfolioId: number) {
  const response = await apiClient.get<MonthlyReport[]>(
    `/paper-portfolios/${portfolioId}/reports`,
  );
  return response.data;
}

export async function generateMonthlyReport(
  portfolioId: number,
  year: number,
  month: number,
) {
  const response = await apiClient.post<MonthlyReport>(
    `/paper-portfolios/${portfolioId}/reports/generate`,
    null,
    { params: { year, month } },
  );
  return response.data;
}

export async function getLatestMonthlyReport(portfolioId: number) {
  const response = await apiClient.get<MonthlyReport>(
    `/paper-portfolios/${portfolioId}/reports/latest`,
  );
  return response.data;
}

export async function getStrategyPerformance(portfolioId: number) {
  const response = await apiClient.get<StrategyPerformance[]>(
    `/paper-portfolios/${portfolioId}/strategy-performance`,
  );
  return response.data;
}

export async function getBacktests() {
  const response = await apiClient.get<BacktestRun[]>("/backtests");
  return response.data;
}

export async function getBacktestTrades(backtestRunId: number) {
  const response = await apiClient.get<BacktestTrade[]>(
    `/backtests/${backtestRunId}/trades`,
  );
  return response.data;
}

export async function getFactorRanking() {
  const response = await apiClient.get<FactorRanking[]>("/backtests/factors/results");
  return response.data;
}

export async function getTradeLogs(portfolioId: number) {
  const response = await apiClient.get<PaperTradeLog[]>(
    `/paper-portfolios/${portfolioId}/trade-logs`,
  );
  return response.data;
}

export async function getReportAssets() {
  const response = await apiClient.get<AssetLookup[]>("/assets");
  return response.data;
}

export async function getReportIndustries() {
  const response = await apiClient.get<IndustryLookup[]>("/industries");
  return response.data;
}
