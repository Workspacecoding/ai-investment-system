"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ActionCenterCard } from "@/components/dashboard/ActionCenterCard";
import { GoalSummaryCard } from "@/components/dashboard/GoalSummaryCard";
import { MarketOverviewCard } from "@/components/dashboard/MarketOverviewCard";
import { PortfolioSummaryCard } from "@/components/dashboard/PortfolioSummaryCard";
import { TopOpportunitiesCard } from "@/components/dashboard/TopOpportunitiesCard";
import { WatchlistSummaryCard } from "@/components/dashboard/WatchlistSummaryCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { useDashboardStore } from "@/store/dashboardStore";

const quickLinks = [
  { href: "/dashboard/watchlist", label: "Watchlist" },
  { href: "/dashboard/swing-center", label: "Swing Center" },
  { href: "/dashboard/portfolio", label: "Portfolio" },
  { href: "/dashboard/goal-planner", label: "Goal Planner" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/reports", label: "Reports" },
];

export default function DashboardPage() {
  const { summary, isLoading, error, fetchDashboardSummary } = useDashboardStore();

  useEffect(() => {
    fetchDashboardSummary();
  }, [fetchDashboardSummary]);

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">投資作戰中心</h1>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              快速掌握市場狀態、今日機會、自選股、Portfolio 與目標進度。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <Link
                className={buttonVariants({ size: "sm", variant: "outline" })}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {error ? (
          <Alert className="border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <AlertTitle>Dashboard 載入失敗</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-3">
          <MarketOverviewCard
            market={summary?.marketOverview ?? null}
            isLoading={isLoading}
          />
          <PortfolioSummaryCard
            portfolio={summary?.portfolioSummary ?? null}
            isLoading={isLoading}
          />
          <GoalSummaryCard goal={summary?.goalSummary ?? null} isLoading={isLoading} />
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
