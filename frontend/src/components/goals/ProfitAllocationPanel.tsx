"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type {
  ProfitAllocation,
  ProfitAllocationRecommendation,
} from "@/lib/api/goals";

import { formatMoney, formatPercent } from "./format";

type ProfitAllocationPanelProps = {
  allocation: ProfitAllocation | null;
  recommendations: ProfitAllocationRecommendation[];
  isLoading: boolean;
  onGenerate: () => void;
};

export function ProfitAllocationPanel({
  allocation,
  recommendations,
  isLoading,
  onGenerate,
}: ProfitAllocationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Profit Allocation</CardTitle>
            <CardDescription>獲利分配與再投入標的建議。</CardDescription>
          </div>
          <Button disabled={isLoading} onClick={onGenerate} type="button">
            產生獲利分配
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!allocation ? (
          <div className="rounded-md border bg-[hsl(var(--muted))] p-4 text-sm text-[hsl(var(--muted-foreground))]">
            尚無獲利分配資料。
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Entertainment"
              value={formatMoney(allocation.entertainment_amount)}
              ratio={formatPercent(allocation.entertainment_ratio)}
            />
            <Metric
              label="Reinvest"
              value={formatMoney(allocation.reinvest_amount)}
              ratio={formatPercent(allocation.reinvest_ratio)}
            />
            <Metric
              label="Cash"
              value={formatMoney(allocation.cash_amount)}
              ratio={formatPercent(allocation.cash_ratio)}
            />
            <Metric
              label="Core Asset"
              value={formatMoney(allocation.core_asset_amount)}
              ratio={formatPercent(allocation.core_asset_ratio)}
            />
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recommendations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-20 text-center text-[hsl(var(--muted-foreground))]"
                >
                  尚無獲利分配推薦標的。
                </TableCell>
              </TableRow>
            ) : null}
            {recommendations.map((recommendation) => (
              <TableRow key={recommendation.id}>
                <TableCell className="font-medium">
                  <Link
                    className="hover:underline"
                    href={`/dashboard/assets/${recommendation.asset_id}`}
                  >
                    {recommendation.symbol}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{recommendation.recommendation_type}</Badge>
                </TableCell>
                <TableCell>{formatMoney(recommendation.allocation_amount)}</TableCell>
                <TableCell className="max-w-lg text-[hsl(var(--muted-foreground))]">
                  {recommendation.reason}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, ratio }: { label: string; value: string; ratio: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{ratio}</p>
    </div>
  );
}
