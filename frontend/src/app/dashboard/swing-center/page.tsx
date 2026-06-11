"use client";

import { useEffect, useMemo } from "react";

import { SwingSetupDetail } from "@/components/swing/SwingSetupDetail";
import { SwingSetupTable } from "@/components/swing/SwingSetupTable";
import { SwingToolbar } from "@/components/swing/SwingToolbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSwingStore } from "@/store/swingStore";

export default function SwingCenterPage() {
  const {
    assets,
    swingSetups,
    selectedSetup,
    marketFilter,
    industryFilter,
    confidenceFilter,
    setupTypeFilter,
    isLoading,
    error,
    fetchSwingRanking,
    generateSwingSetup,
    setSelectedSetup,
    setMarketFilter,
    setIndustryFilter,
    setConfidenceFilter,
    setSetupTypeFilter,
    clearError,
  } = useSwingStore();

  useEffect(() => {
    fetchSwingRanking();
  }, [fetchSwingRanking]);

  const assetsById = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  );

  const filteredSetups = useMemo(() => {
    return swingSetups.filter((setup) => {
      const asset = assetsById.get(setup.asset_id);
      if (marketFilter !== "ALL" && asset?.market !== marketFilter) return false;
      if (confidenceFilter !== "ALL" && setup.confidence_level !== confidenceFilter) {
        return false;
      }
      if (setupTypeFilter !== "ALL" && setup.setup_type !== setupTypeFilter) return false;

      return true;
    });
  }, [assetsById, confidenceFilter, marketFilter, setupTypeFilter, swingSetups]);

  const selectedAsset = selectedSetup
    ? assetsById.get(selectedSetup.asset_id) ?? null
    : null;

  async function handleGenerate(assetId: number) {
    await generateSwingSetup(assetId);
  }

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">波段交易中心</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            查看波段交易買點、加碼區、停損與目標價。
          </p>
        </div>

        <Card>
          <CardContent className="p-5">
            <SwingToolbar
              marketFilter={marketFilter}
              industryFilter={industryFilter}
              confidenceFilter={confidenceFilter}
              setupTypeFilter={setupTypeFilter}
              onMarketChange={setMarketFilter}
              onIndustryChange={setIndustryFilter}
              onConfidenceChange={setConfidenceFilter}
              onSetupTypeChange={setSetupTypeFilter}
              onRefreshRanking={fetchSwingRanking}
            />
          </CardContent>
        </Card>

        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <span>{error}</span>
            <Button onClick={clearError} size="sm" type="button" variant="ghost">
              關閉
            </Button>
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Swing Setups</CardTitle>
            <CardDescription>依信心分數、setup type 與市場條件檢視波段機會。</CardDescription>
          </CardHeader>
          <CardContent>
            <SwingSetupTable
              setups={filteredSetups}
              assetsById={assetsById}
              selectedSetupId={selectedSetup?.id ?? null}
              isLoading={isLoading}
              onView={setSelectedSetup}
              onGenerate={handleGenerate}
            />
          </CardContent>
        </Card>

        <SwingSetupDetail setup={selectedSetup} asset={selectedAsset} />
      </div>
    </main>
  );
}
