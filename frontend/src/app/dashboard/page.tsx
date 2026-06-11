"use client";

import { useEffect } from "react";

import { ActionCenterCard } from "@/components/dashboard/ActionCenterCard";
import { GoalSummaryCard } from "@/components/dashboard/GoalSummaryCard";
import { PortfolioSummaryCard } from "@/components/dashboard/PortfolioSummaryCard";
import { TopIndustriesCard } from "@/components/dashboard/TopIndustriesCard";
import { TopOpportunitiesCard } from "@/components/dashboard/TopOpportunitiesCard";
import { TrackedMarketPanel } from "@/components/dashboard/TrackedMarketPanel";
import { WatchlistSummaryCard } from "@/components/dashboard/WatchlistSummaryCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDashboardStore } from "@/store/dashboardStore";

export default function DashboardPage() {
  const { summary, isLoading, error, fetchDashboardSummary } = useDashboardStore();

  useEffect(() => {
    fetchDashboardSummary();
  }, [fetchDashboardSummary]);

  const trackedMarkets = summary?.marketDashboard?.tracked_markets ?? [];

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">投資作戰中心</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            快速掌握市場狀態、今日機會、自選股、投資組合與目標進度。
          </p>
        </div>

        {error ? (
          <Alert className="border-red-200 bg-red-50 text-red-700">
            <AlertTitle>載入失敗</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {/* Per-market panels: one column per tracked market */}
        {!isLoading && trackedMarkets.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
            <svg fill="none" height="18" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="18">
              <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>尚未追蹤任何市場。請至 <strong>控制台 → 市場管理</strong>，勾選「追蹤」後市場資料將顯示於此。</span>
          </div>
        ) : trackedMarkets.length > 0 ? (
          <section className={`grid gap-4 ${trackedMarkets.length === 1 ? "md:grid-cols-1 max-w-md" : "md:grid-cols-2"}`}>
            {trackedMarkets.map((m) => (
              <TrackedMarketPanel key={m.code} market={m} />
            ))}
          </section>
        ) : null}

        {/* Row: Industries + Portfolio + Goal */}
        <section className="grid gap-4 xl:grid-cols-3">
          <TopIndustriesCard
            data={summary?.marketDashboard ?? null}
            isLoading={isLoading}
          />
          <div className="xl:col-span-2 flex flex-col gap-4">
            <PortfolioSummaryCard
              portfolio={summary?.portfolioSummary ?? null}
              isLoading={isLoading}
            />
            <GoalSummaryCard goal={summary?.goalSummary ?? null} isLoading={isLoading} />
          </div>
        </section>

        <TopOpportunitiesCard
          opportunities={summary?.topOpportunities ?? []}
          isLoading={isLoading}
        />

        <WatchlistSummaryCard
          items={summary?.watchlistSummary ?? []}
          isLoading={isLoading}
        />

        <ActionCenterCard actions={summary?.actions ?? []} isLoading={isLoading} />
      </div>
    </main>
  );
}
