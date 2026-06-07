"use client";

import { useEffect, useMemo, useState } from "react";

import { AddAssetDialog } from "@/components/watchlist/AddAssetDialog";
import { DateRangePicker } from "@/components/watchlist/DateRangePicker";
import { PriceHistoryPanel } from "@/components/watchlist/PriceHistoryPanel";
import { WatchlistTable } from "@/components/watchlist/WatchlistTable";
import { WatchlistToolbar } from "@/components/watchlist/WatchlistToolbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Asset } from "@/lib/api/watchlist";
import { useWatchlistStore } from "@/store/watchlistStore";

export default function DashboardWatchlistPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const {
    assets,
    watchlist,
    selectedAsset,
    priceHistory,
    marketFilter,
    industryFilter,
    startDate,
    endDate,
    isLoading,
    error,
    lastSyncSummary,
    fetchWatchlist,
    addAsset,
    removeAsset,
    startSync,
    stopSync,
    fetchPriceHistory,
    setMarketFilter,
    setIndustryFilter,
    setDateRange,
    setSelectedAsset,
    clearError,
  } = useWatchlistStore();

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist, marketFilter]);

  const assetsById = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  );

  const filteredWatchlist = useMemo(() => {
    return watchlist.filter((item) => {
      const asset = assetsById.get(item.asset_id);
      if (!asset) return marketFilter === "ALL";
      if (marketFilter !== "ALL" && asset.market !== marketFilter) return false;

      return true;
    });
  }, [assetsById, marketFilter, watchlist]);

  const priceCountByAssetId = useMemo(() => {
    const counts = new Map<number, number>();
    if (selectedAsset) {
      counts.set(selectedAsset.id, priceHistory.length);
    }
    return counts;
  }, [priceHistory.length, selectedAsset]);

  async function handleView(asset: Asset) {
    setSelectedAsset(asset);
    await fetchPriceHistory(asset.id);
  }

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">My Watchlist</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            管理自選股與歷史資料同步
          </p>
        </div>

        <Card>
          <CardContent className="p-5">
            <WatchlistToolbar
              marketFilter={marketFilter}
              industryFilter={industryFilter}
              onMarketChange={setMarketFilter}
              onIndustryChange={setIndustryFilter}
              onAddAsset={() => setIsAddDialogOpen(true)}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">History Range</CardTitle>
              <CardDescription>選擇資料起迄日後查看歷史價格。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={setDateRange}
              />
              <Button
                className="w-full"
                disabled={isLoading || !selectedAsset}
                onClick={() => fetchPriceHistory()}
                type="button"
              >
                查詢歷史資料
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sync Status</CardTitle>
              <CardDescription>
                開始同步會呼叫後端 mock crawler 抓取近 10 年資料。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {error ? (
                <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                  <span>{error}</span>
                  <Button onClick={clearError} size="sm" type="button" variant="ghost">
                    關閉
                  </Button>
                </div>
              ) : null}
              {lastSyncSummary ? (
                <div className="rounded-md border bg-[hsl(var(--muted))] px-4 py-3 text-sm">
                  {lastSyncSummary}
                </div>
              ) : null}
              {!error && !lastSyncSummary ? (
                <div className="rounded-md border bg-[hsl(var(--muted))] px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                  選擇一檔自選股後可查看資料、開始同步或停止同步。
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Watchlist</CardTitle>
            <CardDescription>管理同步狀態、查看歷史資料與移除自選股。</CardDescription>
          </CardHeader>
          <CardContent>
            <WatchlistTable
              assetsById={assetsById}
              items={filteredWatchlist}
              selectedAssetId={selectedAsset?.id ?? null}
              isLoading={isLoading}
              priceCountByAssetId={priceCountByAssetId}
              onView={handleView}
              onStartSync={startSync}
              onStopSync={stopSync}
              onRemove={removeAsset}
            />
          </CardContent>
        </Card>

        <PriceHistoryPanel
          asset={selectedAsset}
          prices={priceHistory}
          startDate={startDate}
          endDate={endDate}
        />
      </div>

      <AddAssetDialog
        open={isAddDialogOpen}
        isLoading={isLoading}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={addAsset}
      />
    </main>
  );
}
