"use client";

import { useEffect, useState } from "react";

import { AssetFundamentalPanel } from "@/components/assets/AssetFundamentalPanel";
import { AssetHeader } from "@/components/assets/AssetHeader";
import { AssetIndicatorTable } from "@/components/assets/AssetIndicatorTable";
import { AssetNewsPanel } from "@/components/assets/AssetNewsPanel";
import { AssetPriceChart } from "@/components/assets/AssetPriceChart";
import { AssetPriceSummary } from "@/components/assets/AssetPriceSummary";
import { AssetScorePanel } from "@/components/assets/AssetScorePanel";
import { AssetSwingPanel } from "@/components/assets/AssetSwingPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAssetDetailStore } from "@/store/assetDetailStore";

type AssetDetailClientProps = {
  assetId: number;
};

export function AssetDetailClient({ assetId }: AssetDetailClientProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const {
    asset,
    prices,
    latestScore,
    latestSwingSetup,
    fundamentals,
    latestFundamentalScore,
    news,
    technicalIndicators,
    latestPriceLevel,
    isInWatchlist,
    startDate,
    endDate,
    isLoading,
    error,
    fetchAssetDetail,
    fetchPrices,
    generateSwingSetup,
    setDateRange,
    clearAssetDetail,
    clearError,
  } = useAssetDetailStore();

  useEffect(() => {
    fetchAssetDetail(assetId);
    return () => clearAssetDetail();
  }, [assetId, clearAssetDetail, fetchAssetDetail]);

  if (isLoading && !asset) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="mx-auto w-full max-w-7xl space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <span>{error}</span>
            <Button onClick={clearError} size="sm" type="button" variant="ghost">
              關閉
            </Button>
          </div>
        ) : null}

        <AssetHeader asset={asset} isInWatchlist={isInWatchlist} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger
              activeValue={activeTab}
              onValueChange={setActiveTab}
              tabValue="overview"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              activeValue={activeTab}
              onValueChange={setActiveTab}
              tabValue="chart"
            >
              Chart
            </TabsTrigger>
            <TabsTrigger
              activeValue={activeTab}
              onValueChange={setActiveTab}
              tabValue="fundamental"
            >
              Fundamentals
            </TabsTrigger>
            <TabsTrigger
              activeValue={activeTab}
              onValueChange={setActiveTab}
              tabValue="news"
            >
              News
            </TabsTrigger>
          </TabsList>

          <TabsContent activeValue={activeTab} tabValue="overview">
            <AssetPriceSummary
              prices={prices}
              technicalIndicators={technicalIndicators}
              priceLevel={latestPriceLevel}
            />
            <AssetScorePanel score={latestScore} />
            <AssetSwingPanel
              assetId={assetId}
              setup={latestSwingSetup}
              isLoading={isLoading}
              onGenerate={generateSwingSetup}
            />
          </TabsContent>

          <TabsContent activeValue={activeTab} tabValue="chart">
            <AssetPriceChart
              prices={prices}
              technicalIndicators={technicalIndicators}
              startDate={startDate}
              endDate={endDate}
              isLoading={isLoading}
              onDateRangeChange={setDateRange}
              onRefresh={() => fetchPrices(assetId, startDate, endDate)}
            />
            <AssetIndicatorTable indicators={technicalIndicators} />
          </TabsContent>

          <TabsContent activeValue={activeTab} tabValue="fundamental">
            <AssetFundamentalPanel
              fundamentals={fundamentals}
              latestFundamentalScore={latestFundamentalScore}
            />
          </TabsContent>

          <TabsContent activeValue={activeTab} tabValue="news">
            <AssetNewsPanel news={news} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
