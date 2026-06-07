"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PortfolioSummary as PortfolioSummaryData } from "@/lib/api/portfolio";

import { formatMoney, formatPercent, pnlClass } from "./format";

type PortfolioSummaryProps = {
  summary: PortfolioSummaryData | null;
  isLoading: boolean;
};

function SummaryMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${className ?? ""}`}>{value}</p>
    </div>
  );
}

export function PortfolioSummary({ summary, isLoading }: PortfolioSummaryProps) {
  if (isLoading && !summary) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Center</CardTitle>
        <CardDescription>{summary?.portfolio_name || "投資組合中心"}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryMetric label="總資產" value={formatMoney(summary?.total_value ?? 0)} />
        <SummaryMetric label="總成本" value={formatMoney(summary?.total_cost ?? 0)} />
        <SummaryMetric
          className={pnlClass(summary?.unrealized_pnl ?? 0)}
          label="未實現損益"
          value={formatMoney(summary?.unrealized_pnl ?? 0)}
        />
        <SummaryMetric
          className={pnlClass(summary?.return_percent ?? 0)}
          label="報酬率"
          value={formatPercent(summary?.return_percent ?? 0)}
        />
        <SummaryMetric
          className={pnlClass(summary?.monthly_return ?? 0)}
          label="本月績效"
          value={formatPercent(summary?.monthly_return ?? 0)}
        />
      </CardContent>
    </Card>
  );
}
