"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardPortfolioSummary } from "@/lib/api/dashboard";

import { formatMoney, formatPercent, pnlClass } from "./format";

type PortfolioSummaryCardProps = {
  portfolio: DashboardPortfolioSummary | null;
  isLoading: boolean;
};

export function PortfolioSummaryCard({ portfolio, isLoading }: PortfolioSummaryCardProps) {
  if (isLoading && !portfolio) return <Skeleton className="h-52 w-full" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">投資組合</CardTitle>
            <CardDescription>資產價值與現金配置</CardDescription>
          </div>
          <Link className={buttonVariants({ size: "sm", variant: "outline" })} href="/dashboard/portfolio">
            前往投資組合
          </Link>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Metric label="總資產" value={formatMoney(portfolio?.total_value ?? 0)} />
        <Metric
          className={pnlClass(portfolio?.unrealized_pnl ?? 0)}
          label="未實現損益"
          value={formatMoney(portfolio?.unrealized_pnl ?? 0)}
        />
        <Metric
          className={pnlClass(portfolio?.return_percent ?? 0)}
          label="報酬率"
          value={formatPercent(portfolio?.return_percent ?? 0)}
        />
        <Metric label="現金佔比" value={formatPercent(portfolio?.cash_percent ?? 0)} />
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className={`mt-1 text-sm font-medium ${className ?? ""}`}>{value}</p>
    </div>
  );
}
