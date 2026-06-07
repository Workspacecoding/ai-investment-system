import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssetLookup, MonthlyReport } from "@/lib/api/reports";

import { assetLabel, money, percent } from "./format";

type MonthlyReportPanelProps = {
  report: MonthlyReport | null;
  assets: AssetLookup[];
  isLoading: boolean;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <span className="text-sm text-[hsl(var(--muted-foreground))]">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export function MonthlyReportPanel({ assets, isLoading, report }: MonthlyReportPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Monthly Report</CardTitle>
            <CardDescription>
              Initial / ending equity、交易勝率、最大回撤與最佳 / 最差標的。
            </CardDescription>
          </div>
          {report ? (
            <Badge variant="secondary">
              {report.report_year}-{String(report.report_month).padStart(2, "0")}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : !report ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            目前尚無績效報告，請先產生月報。
          </div>
        ) : (
          <div className="grid gap-x-8 md:grid-cols-2">
            <div>
              <Row label="Initial Equity" value={money(report.initial_equity)} />
              <Row label="Ending Equity" value={money(report.ending_equity)} />
              <Row label="Total Return %" value={percent(report.total_return_percent)} />
              <Row label="Realized PnL" value={money(report.realized_pnl)} />
              <Row label="Unrealized PnL" value={money(report.unrealized_pnl)} />
              <Row label="Max Drawdown" value={percent(report.max_drawdown)} />
            </div>
            <div>
              <Row label="Total Trades" value={String(report.total_trades)} />
              <Row label="Win Trades" value={String(report.win_trades)} />
              <Row label="Lose Trades" value={String(report.lose_trades)} />
              <Row label="Win Rate" value={percent(report.win_rate)} />
              <Row label="Best Asset" value={assetLabel(report.best_asset_id, assets)} />
              <Row label="Worst Asset" value={assetLabel(report.worst_asset_id, assets)} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
