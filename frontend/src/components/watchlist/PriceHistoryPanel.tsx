"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Asset, AssetPrice } from "@/lib/api/watchlist";

type PriceHistoryPanelProps = {
  asset: Asset | null;
  prices: AssetPrice[];
  startDate: string;
  endDate: string;
};

function latestPrice(prices: AssetPrice[]) {
  return [...prices].sort((left, right) =>
    right.trade_date.localeCompare(left.trade_date),
  )[0];
}

function formatNumber(value: number | string) {
  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
}

export function PriceHistoryPanel({
  asset,
  prices,
  startDate,
  endDate,
}: PriceHistoryPanelProps) {
  const latest = latestPrice(prices);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price History</CardTitle>
        <CardDescription>
          {asset ? `${asset.symbol} ${startDate} - ${endDate}` : "選擇自選股查看歷史資料。"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border p-3">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">資料筆數</p>
            <p className="mt-1 text-lg font-semibold">{prices.length}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">最新日期</p>
            <p className="mt-1 text-lg font-semibold">{latest?.trade_date ?? "-"}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">最新收盤價</p>
            <p className="mt-1 text-lg font-semibold">
              {latest ? formatNumber(latest.close_price) : "-"}
            </p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>trade_date</TableHead>
              <TableHead>open_price</TableHead>
              <TableHead>high_price</TableHead>
              <TableHead>low_price</TableHead>
              <TableHead>close_price</TableHead>
              <TableHead>volume</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-20 text-center text-[hsl(var(--muted-foreground))]"
                >
                  查無資料。
                </TableCell>
              </TableRow>
            ) : null}
            {prices.slice(0, 80).map((price) => (
              <TableRow key={price.id}>
                <TableCell>{price.trade_date}</TableCell>
                <TableCell>{formatNumber(price.open_price)}</TableCell>
                <TableCell>{formatNumber(price.high_price)}</TableCell>
                <TableCell>{formatNumber(price.low_price)}</TableCell>
                <TableCell>{formatNumber(price.close_price)}</TableCell>
                <TableCell>{formatNumber(price.volume)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
