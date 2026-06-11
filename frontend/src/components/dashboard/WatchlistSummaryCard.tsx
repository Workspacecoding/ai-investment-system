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
        <CardTitle className="text-base">自選股摘要</CardTitle>
        <CardDescription>自選股最新狀態</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>代碼</TableHead>
              <TableHead>現價</TableHead>
              <TableHead>分數</TableHead>
              <TableHead>建議</TableHead>
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
