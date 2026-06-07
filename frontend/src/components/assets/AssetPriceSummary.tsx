"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AssetPrice, PriceLevel, TechnicalIndicator } from "@/lib/api/assets";

import { formatNumber, formatPercent, humanize } from "./format";

type AssetPriceSummaryProps = {
  prices: AssetPrice[];
  technicalIndicators: TechnicalIndicator[];
  priceLevel: PriceLevel | null;
};

function latestByDate<T extends { trade_date: string }>(items: T[]) {
  return [...items].sort((left, right) => right.trade_date.localeCompare(left.trade_date))[0];
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

export function AssetPriceSummary({
  prices,
  technicalIndicators,
  priceLevel,
}: AssetPriceSummaryProps) {
  const latestPrice = latestByDate(prices);
  const latestIndicator = latestByDate(technicalIndicators);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Price Summary</CardTitle>
        <CardDescription>價格、均線與 52 週檔位。</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryItem label="Current Price" value={formatNumber(latestPrice?.close_price)} />
        <SummaryItem label="MA20" value={formatNumber(latestIndicator?.ma20)} />
        <SummaryItem label="MA60" value={formatNumber(latestIndicator?.ma60)} />
        <SummaryItem label="52W High" value={formatNumber(priceLevel?.high_52w)} />
        <SummaryItem label="52W Low" value={formatNumber(priceLevel?.low_52w)} />
        <SummaryItem
          label="52W Percentile"
          value={
            priceLevel
              ? formatPercent(Number(priceLevel.percentile_52w) * 100)
              : "尚無資料"
          }
        />
        <SummaryItem label="Level 52W" value={humanize(priceLevel?.level_52w)} />
      </CardContent>
    </Card>
  );
}
