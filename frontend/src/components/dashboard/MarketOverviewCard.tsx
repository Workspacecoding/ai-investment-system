"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MarketOverview } from "@/lib/api/dashboard";

import { formatPercent, humanize } from "./format";

type MarketOverviewCardProps = {
  market: MarketOverview | null;
  isLoading: boolean;
};

export function MarketOverviewCard({ market, isLoading }: MarketOverviewCardProps) {
  if (isLoading && !market) return <Skeleton className="h-52 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Market Overview</CardTitle>
        <CardDescription>市場狀態與產業動能</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Market State</p>
            <p className="mt-1 text-xl font-semibold">{humanize(market?.market_state ?? "sideways")}</p>
          </div>
          <Badge
            variant={
              market?.bull_bear === "Bull"
                ? "success"
                : market?.bull_bear === "Bear"
                  ? "destructive"
                  : "warning"
            }
          >
            {market?.bull_bear ?? "Sideways"}
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Market Score" value={formatPercent(market?.market_score ?? 0)} />
          <Metric label="Top Industry" value={market?.top_industry ?? "尚無資料"} />
          <Metric
            label="Top Industry Momentum"
            value={formatPercent(market?.top_industry_momentum ?? 0)}
          />
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
