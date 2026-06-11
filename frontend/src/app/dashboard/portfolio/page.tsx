"use client";

import { useEffect, useState } from "react";

import { AllocationChart } from "@/components/portfolio/AllocationChart";
import { GoalProgressPanel } from "@/components/portfolio/GoalProgressPanel";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { IndustryExposureChart } from "@/components/portfolio/IndustryExposureChart";
import { OptimizationPanel } from "@/components/portfolio/OptimizationPanel";
import { PortfolioSummary } from "@/components/portfolio/PortfolioSummary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePortfolioStore } from "@/store/portfolioStore";

export default function PortfolioCenterPage() {
  const [activeTab, setActiveTab] = useState("holdings");
  const {
    summary,
    holdings,
    allocation,
    industryExposure,
    optimization,
    goalProgress,
    isLoading,
    error,
    fetchPortfolioData,
  } = usePortfolioStore();

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  const hasPortfolio = Boolean(summary?.portfolio_id);

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">投資組合中心</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            查看持股、損益、配置、產業曝險與最佳化建議。
          </p>
        </div>

        {error ? (
          <Alert className="border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <AlertTitle>資料載入失敗</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <PortfolioSummary summary={summary} isLoading={isLoading} />

        {!isLoading && !hasPortfolio ? (
          <Alert>
            <AlertTitle>目前尚未建立投資組合。</AlertTitle>
            <AlertDescription>請先建立自選股並模擬交易。</AlertDescription>
          </Alert>
        ) : null}

        <GoalProgressPanel goalProgress={goalProgress} />

        <div className="grid gap-4 xl:grid-cols-2">
          <AllocationChart data={allocation} />
          <IndustryExposureChart data={industryExposure} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger
              activeValue={activeTab}
              onValueChange={setActiveTab}
              tabValue="holdings"
            >
              Holdings
            </TabsTrigger>
            <TabsTrigger
              activeValue={activeTab}
              onValueChange={setActiveTab}
              tabValue="optimization"
            >
              Optimization
            </TabsTrigger>
          </TabsList>

          <TabsContent activeValue={activeTab} tabValue="holdings">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Holdings</CardTitle>
                <CardDescription>目前持股與未實現損益。</CardDescription>
              </CardHeader>
              <CardContent>
                <HoldingsTable holdings={holdings} isLoading={isLoading} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent activeValue={activeTab} tabValue="optimization">
            <OptimizationPanel optimization={optimization} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
