import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MonthlyReport } from "@/lib/api/reports";

import { money, percent } from "./format";

type PerformanceSummaryCardsProps = {
  report: MonthlyReport | null;
  isLoading: boolean;
};

const emptyItems = [
  ["Total Return %", "-"],
  ["Realized PnL", "-"],
  ["Unrealized PnL", "-"],
  ["Win Rate", "-"],
  ["Max Drawdown", "-"],
  ["Total Trades", "-"],
];

export function PerformanceSummaryCards({ isLoading, report }: PerformanceSummaryCardsProps) {
  const items = report
    ? [
        ["Total Return %", percent(report.total_return_percent)],
        ["Realized PnL", money(report.realized_pnl)],
        ["Unrealized PnL", money(report.unrealized_pnl)],
        ["Win Rate", percent(report.win_rate)],
        ["Max Drawdown", percent(report.max_drawdown)],
        ["Total Trades", String(report.total_trades)],
      ]
    : emptyItems;

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      {items.map(([label, value]) => (
        <Card key={label}>
          <CardHeader className="p-4 pb-2">
            <CardDescription>{label}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <CardTitle className="text-xl">{value}</CardTitle>
            )}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
