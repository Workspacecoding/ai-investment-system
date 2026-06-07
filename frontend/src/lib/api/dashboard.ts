import { apiClient } from "@/lib/api/client";

type Asset = {
  id: number;
  symbol: string;
  name: string;
  market: string;
};

type MarketSnapshot = {
  market_score: number | string;
  market_regime: string;
};

type Industry = {
  id: number;
  industry_name: string;
};

type IndustryMomentum = {
  industry_id: number;
  momentum_score: number | string;
};

type SwingSetup = {
  asset_id: number;
  swing_score: number | string;
  entry_zone_low: number | string;
  entry_zone_high: number | string;
  confidence_level: string;
};

type WatchlistItem = {
  asset_id: number;
};

type AssetPrice = {
  close_price: number | string;
  trade_date: string;
};

type AssetScore = {
  final_score: number | string;
  rating: string;
};

type TradePlan = {
  asset_id: number;
  action: string;
  entry_price: number | string | null;
  final_score: number | string;
};

type PaperPortfolio = {
  id: number;
  total_equity: number | string;
  cash_balance: number | string;
  unrealized_pnl: number | string;
  created_at: string;
};

type PaperPosition = {
  market_value: number | string;
  avg_cost: number | string;
  quantity: number | string;
};

type GoalStrategy = {
  current_capital: number | string;
  target_capital: number | string;
  probability_score: number | string;
};

export type MarketOverview = {
  market_state: string;
  market_score: number;
  bull_bear: "Bull" | "Bear" | "Sideways";
  top_industry: string;
  top_industry_momentum: number;
};

export type DashboardOpportunity = {
  asset_id: number;
  symbol: string;
  score: number;
  swing_score: number;
  entry_zone: string;
  confidence: string;
};

export type DashboardWatchlistItem = {
  asset_id: number;
  symbol: string;
  current_price: number;
  score: number;
  action: string;
};

export type DashboardPortfolioSummary = {
  total_value: number;
  unrealized_pnl: number;
  return_percent: number;
  cash_percent: number;
};

export type DashboardGoalSummary = {
  current_capital: number;
  target_capital: number;
  progress_percent: number;
  probability_score: number;
};

export type DashboardAction = {
  asset_id: number;
  symbol: string;
  action: "BUY" | "WATCH" | "REDUCE" | "SELL";
  detail: string;
};

export type DashboardSummary = {
  marketOverview: MarketOverview;
  topOpportunities: DashboardOpportunity[];
  watchlistSummary: DashboardWatchlistItem[];
  portfolioSummary: DashboardPortfolioSummary;
  goalSummary: DashboardGoalSummary | null;
  actions: DashboardAction[];
};

function num(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number | string | null | undefined) {
  return num(value).toFixed(2);
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

async function getAssetScore(assetId: number) {
  const response = await apiClient.get<AssetScore>(`/assets/${assetId}/score/latest`);
  return response.data;
}

async function getAssetPrices(assetId: number) {
  const response = await apiClient.get<AssetPrice[]>(`/assets/${assetId}/prices`);
  return response.data;
}

function latestPrice(prices: AssetPrice[]) {
  return [...prices].sort((left, right) => right.trade_date.localeCompare(left.trade_date))[0];
}

function latestPortfolio(portfolios: PaperPortfolio[]) {
  return [...portfolios].sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
}

function mapTradeAction(action: string): DashboardAction["action"] {
  if (action === "buy") return "BUY";
  if (action === "watch") return "WATCH";
  if (action === "sell" || action === "avoid") return "SELL";
  return "REDUCE";
}

export async function getMarketOverview(): Promise<MarketOverview> {
  const [market, industries, momentum] = await Promise.all([
    safe<MarketSnapshot | null>(
      apiClient.get<MarketSnapshot>("/market/snapshots/latest").then((r) => r.data),
      null,
    ),
    safe<Industry[]>(apiClient.get<Industry[]>("/industries").then((r) => r.data), []),
    safe<IndustryMomentum[]>(
      apiClient.get<IndustryMomentum[]>("/industries/momentum/ranking").then((r) => r.data),
      [],
    ),
  ]);
  const topMomentum = momentum[0];
  const topIndustry = industries.find((industry) => industry.id === topMomentum?.industry_id);
  const regime = market?.market_regime ?? "sideways";

  return {
    market_state: regime,
    market_score: num(market?.market_score),
    bull_bear: regime === "bull" ? "Bull" : regime === "bear" ? "Bear" : "Sideways",
    top_industry: topIndustry?.industry_name ?? "尚無資料",
    top_industry_momentum: num(topMomentum?.momentum_score),
  };
}

export async function getTopOpportunities(): Promise<DashboardOpportunity[]> {
  const [assets, swingSetups] = await Promise.all([
    getAssets(),
    safe<SwingSetup[]>(
      apiClient.get<SwingSetup[]>("/swing-setups/ranking").then((r) => r.data),
      [],
    ),
  ]);
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

  return Promise.all(
    swingSetups.slice(0, 5).map(async (setup) => {
      const asset = assetsById.get(setup.asset_id);
      const score = await safe<AssetScore | null>(getAssetScore(setup.asset_id), null);
      return {
        asset_id: setup.asset_id,
        symbol: asset?.symbol ?? String(setup.asset_id),
        score: num(score?.final_score),
        swing_score: num(setup.swing_score),
        entry_zone: `${money(setup.entry_zone_low)} ~ ${money(setup.entry_zone_high)}`,
        confidence: setup.confidence_level,
      };
    }),
  );
}

export async function getWatchlistSummary(): Promise<DashboardWatchlistItem[]> {
  const [assets, watchlist] = await Promise.all([
    getAssets(),
    safe<WatchlistItem[]>(apiClient.get<WatchlistItem[]>("/watchlist").then((r) => r.data), []),
  ]);
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

  return Promise.all(
    watchlist.slice(0, 10).map(async (item) => {
      const [prices, score, tradePlan] = await Promise.all([
        safe<AssetPrice[]>(getAssetPrices(item.asset_id), []),
        safe<AssetScore | null>(getAssetScore(item.asset_id), null),
        safe<TradePlan | null>(
          apiClient
            .get<TradePlan>(`/assets/${item.asset_id}/trade-plan/latest`)
            .then((r) => r.data),
          null,
        ),
      ]);
      const asset = assetsById.get(item.asset_id);
      return {
        asset_id: item.asset_id,
        symbol: asset?.symbol ?? String(item.asset_id),
        current_price: num(latestPrice(prices)?.close_price),
        score: num(score?.final_score),
        action: tradePlan?.action ?? "watch",
      };
    }),
  );
}

export async function getPortfolioSummary(): Promise<DashboardPortfolioSummary> {
  const portfolios = await safe<PaperPortfolio[]>(
    apiClient.get<PaperPortfolio[]>("/paper-portfolios").then((r) => r.data),
    [],
  );
  const portfolio = latestPortfolio(portfolios);
  if (!portfolio) {
    return { total_value: 0, unrealized_pnl: 0, return_percent: 0, cash_percent: 0 };
  }

  const positions = await safe<PaperPosition[]>(
    apiClient
      .get<PaperPosition[]>(`/paper-portfolios/${portfolio.id}/positions`)
      .then((r) => r.data),
    [],
  );
  const totalCost = positions.reduce(
    (sum, position) => sum + num(position.avg_cost) * num(position.quantity),
    0,
  );
  const totalValue = num(portfolio.total_equity);

  return {
    total_value: totalValue,
    unrealized_pnl: num(portfolio.unrealized_pnl),
    return_percent: totalCost > 0 ? (num(portfolio.unrealized_pnl) / totalCost) * 100 : 0,
    cash_percent: totalValue > 0 ? (num(portfolio.cash_balance) / totalValue) * 100 : 0,
  };
}

export async function getGoalSummary(): Promise<DashboardGoalSummary | null> {
  const strategy = await safe<GoalStrategy | null>(
    apiClient.get<GoalStrategy>("/goal-strategies/latest").then((r) => r.data),
    null,
  );
  if (!strategy) return null;

  const current = num(strategy.current_capital);
  const target = num(strategy.target_capital);
  return {
    current_capital: current,
    target_capital: target,
    progress_percent: target > 0 ? (current / target) * 100 : 0,
    probability_score: num(strategy.probability_score),
  };
}

async function getActionCenter(): Promise<DashboardAction[]> {
  const [assets, tradePlans, swingSetups] = await Promise.all([
    getAssets(),
    safe<TradePlan[]>(apiClient.get<TradePlan[]>("/trade-plans/ranking").then((r) => r.data), []),
    safe<SwingSetup[]>(
      apiClient.get<SwingSetup[]>("/swing-setups/ranking").then((r) => r.data),
      [],
    ),
  ]);
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const actions = tradePlans.slice(0, 4).map((plan) => ({
    asset_id: plan.asset_id,
    symbol: assetsById.get(plan.asset_id)?.symbol ?? String(plan.asset_id),
    action: mapTradeAction(plan.action),
    detail: plan.entry_price
      ? `Entry ${money(plan.entry_price)}`
      : `Score ${num(plan.final_score).toFixed(1)}`,
  }));

  swingSetups.slice(0, 3).forEach((setup) => {
    if (actions.some((action) => action.asset_id === setup.asset_id)) return;
    actions.push({
      asset_id: setup.asset_id,
      symbol: assetsById.get(setup.asset_id)?.symbol ?? String(setup.asset_id),
      action: setup.confidence_level === "high" ? "BUY" : "WATCH",
      detail: `Entry ${money(setup.entry_zone_low)}`,
    });
  });

  return actions.slice(0, 6);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [
    marketOverview,
    topOpportunities,
    watchlistSummary,
    portfolioSummary,
    goalSummary,
    actions,
  ] = await Promise.all([
    getMarketOverview(),
    getTopOpportunities(),
    getWatchlistSummary(),
    getPortfolioSummary(),
    getGoalSummary(),
    getActionCenter(),
  ]);

  return {
    marketOverview,
    topOpportunities,
    watchlistSummary,
    portfolioSummary,
    goalSummary,
    actions,
  };
}
