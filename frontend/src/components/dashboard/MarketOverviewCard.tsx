"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MarketOverview } from "@/lib/api/dashboard";

import { formatPercent } from "./format";

const STATE_ZH: Record<string, string> = { bull: "多頭", bear: "空頭", sideways: "盤整" };
const BULL_ZH: Record<string, string> = { Bull: "多頭", Bear: "空頭", Sideways: "盤整" };

type Props = { market: MarketOverview | null; isLoading: boolean };

export function MarketOverviewCard({ market, isLoading }: Props) {
  if (isLoading && !market) return <Skeleton className="h-52 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">市場總覽</CardTitle>
        <CardDescription>市場狀態與產業動能</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">市場狀態</p>
            <p className="mt-1 text-xl font-semibold">
              {STATE_ZH[market?.market_state ?? "sideways"] ?? "盤整"}
            </p>
          </div>
          <Badge
            variant={
              market?.bull_bear === "Bull" ? "success"
              : market?.bull_bear === "Bear" ? "destructive"
              : "warning"
            }
          >
            {BULL_ZH[market?.bull_bear ?? "Sideways"] ?? "盤整"}
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="市場分數" value={formatPercent(market?.market_score ?? 0)} />
          <Metric label="最強產業" value={market?.top_industry ?? "尚無資料"} />
          <Metric label="產業動能" value={formatPercent(market?.top_industry_momentum ?? 0)} />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
