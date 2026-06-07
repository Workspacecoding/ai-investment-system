"use client";

import { useEffect, useState } from "react";

import { BacktestResultsTable } from "@/components/reports/BacktestResultsTable";
import { FactorRankingTable } from "@/components/reports/FactorRankingTable";
import { MonthlyReportPanel } from "@/components/reports/MonthlyReportPanel";
import { PerformanceSummaryCards } from "@/components/reports/PerformanceSummaryCards";
import { ReportDateFilter } from "@/components/reports/ReportDateFilter";
import { StrategyPerformanceTable } from "@/components/reports/StrategyPerformanceTable";
import { TradeLogsTable } from "@/components/reports/TradeLogsTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReportStore } from "@/store/reportStore";

const tabs = [
  { value: "monthly", label: "Monthly" },
  { value: "strategy", label: "Strategy" },
  { value: "backtests", label: "Backtests" },
  { value: "factors", label: "Factors" },
  { value: "trades", label: "Trade Logs" },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("monthly");
  const {
    assets,
    backtests,
    error,
    factorRanking,
    fetchBacktestTrades,
    fetchInitialData,
    generateMonthlyReport,
    industries,
    isLoading,
    latestMonthlyReport,
    portfolios,
    selectedBacktestId,
    selectedBacktestTrades,
    selectedMonth,
    selectedPortfolioId,
    selectedYear,
    setDateFilter,
    setPortfolioId,
    strategyPerformance,
    tradeLogs,
  } = useReportStore();

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Reports Center</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            查看月結績效、策略績效、回測與因子排名。
          </p>
        </div>

        {error ? (
          <Alert className="border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <AlertTitle>Reports Center 載入失敗</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <ReportDateFilter
          isLoading={isLoading}
          onDateChange={setDateFilter}
          onGenerate={generateMonthlyReport}
          onPortfolioChange={setPortfolioId}
          portfolios={portfolios}
          selectedMonth={selectedMonth}
          selectedPortfolioId={selectedPortfolioId}
          selectedYear={selectedYear}
        />

        <PerformanceSummaryCards isLoading={isLoading} report={latestMonthlyReport} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex w-full flex-wrap">
            {tabs.map((tab) => (
              <TabsTrigger
                activeValue={activeTab}
                key={tab.value}
                onValueChange={setActiveTab}
                tabValue={tab.value}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent activeValue={activeTab} tabValue="monthly">
            <MonthlyReportPanel
              assets={assets}
              isLoading={isLoading}
              report={latestMonthlyReport}
            />
          </TabsContent>

          <TabsContent activeValue={activeTab} tabValue="strategy">
            <StrategyPerformanceTable
              isLoading={isLoading}
              items={strategyPerformance}
            />
          </TabsContent>

          <TabsContent activeValue={activeTab} tabValue="backtests">
            <BacktestResultsTable
              assets={assets}
              backtests={backtests}
              isLoading={isLoading}
              onSelectBacktest={fetchBacktestTrades}
              selectedBacktestId={selectedBacktestId}
              trades={selectedBacktestTrades}
            />
          </TabsContent>

          <TabsContent activeValue={activeTab} tabValue="factors">
            <FactorRankingTable
              industries={industries}
              isLoading={isLoading}
              items={factorRanking}
            />
          </TabsContent>

          <TabsContent activeValue={activeTab} tabValue="trades">
            <TradeLogsTable assets={assets} isLoading={isLoading} items={tradeLogs} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
