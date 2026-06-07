"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AssetPrice, TechnicalIndicator } from "@/lib/api/assets";

import { numberValue } from "./format";

type AssetPriceChartProps = {
  prices: AssetPrice[];
  technicalIndicators: TechnicalIndicator[];
  startDate: string;
  endDate: string;
  isLoading: boolean;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  onRefresh: () => void;
};

type ChartPoint = {
  date: string;
  close: number;
  ma20: number | null;
  ma60: number | null;
};

function buildPoints(prices: AssetPrice[], indicators: TechnicalIndicator[]) {
  const indicatorsByDate = new Map(indicators.map((indicator) => [indicator.trade_date, indicator]));
  return [...prices]
    .sort((left, right) => left.trade_date.localeCompare(right.trade_date))
    .map((price) => {
      const indicator = indicatorsByDate.get(price.trade_date);
      return {
        date: price.trade_date,
        close: numberValue(price.close_price) ?? 0,
        ma20: numberValue(indicator?.ma20),
        ma60: numberValue(indicator?.ma60),
      };
    });
}

function linePath(points: ChartPoint[], key: "close" | "ma20" | "ma60", min: number, max: number) {
  const drawableWidth = 700;
  const drawableHeight = 240;
  const values = points
    .map((point, index) => ({ value: point[key], index }))
    .filter((point): point is { value: number; index: number } => point.value !== null);

  if (values.length === 0) return "";

  return values
    .map(({ value, index }, order) => {
      const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * drawableWidth;
      const y = drawableHeight - ((value - min) / Math.max(max - min, 1)) * drawableHeight;
      return `${order === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function AssetPriceChart({
  prices,
  technicalIndicators,
  startDate,
  endDate,
  isLoading,
  onDateRangeChange,
  onRefresh,
}: AssetPriceChartProps) {
  const points = buildPoints(prices, technicalIndicators);
  const allValues = points.flatMap((point) =>
    [point.close, point.ma20, point.ma60].filter((value): value is number => value !== null),
  );
  const min = allValues.length ? Math.min(...allValues) : 0;
  const max = allValues.length ? Math.max(...allValues) : 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-base">Price Chart</CardTitle>
            <CardDescription>Close Price / MA20 / MA60</CardDescription>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="asset-chart-start">Start</Label>
              <Input
                id="asset-chart-start"
                type="date"
                value={startDate}
                onChange={(event) => onDateRangeChange(event.target.value, endDate)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-chart-end">End</Label>
              <Input
                id="asset-chart-end"
                type="date"
                value={endDate}
                onChange={(event) => onDateRangeChange(startDate, event.target.value)}
              />
            </div>
            <Button disabled={isLoading} onClick={onRefresh} type="button">
              更新
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center rounded-md border bg-[hsl(var(--muted))] text-sm text-[hsl(var(--muted-foreground))]">
            尚無價格資料。
          </div>
        ) : (
          <div className="rounded-md border p-4">
            <svg viewBox="0 0 700 240" className="h-[280px] w-full overflow-visible">
              <path
                d={linePath(points, "close", min, max)}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
              />
              <path
                d={linePath(points, "ma20", min, max)}
                fill="none"
                stroke="rgb(14 165 233)"
                strokeWidth="1.5"
              />
              <path
                d={linePath(points, "ma60", min, max)}
                fill="none"
                stroke="rgb(245 158 11)"
                strokeWidth="1.5"
              />
            </svg>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-[hsl(var(--muted-foreground))]">
              <span>Close</span>
              <span>MA20</span>
              <span>MA60</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
