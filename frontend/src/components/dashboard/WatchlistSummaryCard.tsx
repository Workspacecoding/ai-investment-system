"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardWatchlistItem } from "@/lib/api/dashboard";

import { formatMoney } from "./format";

type WatchlistSummaryCardProps = {
  items: DashboardWatchlistItem[];
  isLoading: boolean;
};

export function WatchlistSummaryCard({ items, isLoading }: WatchlistSummaryCardProps) {
  if (isLoading && items.length === 0) return <Skeleton className="h-96 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Watchlist Summary</CardTitle>
        <CardDescription>前 10 檔自選股狀態</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Current Price</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-[hsl(var(--muted-foreground))]"
                >
                  尚未加入自選股。
                </TableCell>
              </TableRow>
            ) : null}
            {items.map((item) => (
              <TableRow key={item.asset_id}>
                <TableCell className="font-medium">
                  <Link className="hover:underline" href={`/dashboard/assets/${item.asset_id}`}>
                    {item.symbol}
                  </Link>
                </TableCell>
                <TableCell>{formatMoney(item.current_price)}</TableCell>
                <TableCell>{item.score.toFixed(1)}</TableCell>
                <TableCell>
                  <Badge variant={item.action === "buy" ? "success" : "secondary"}>
                    {item.action}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
