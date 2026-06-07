"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FundamentalReport, FundamentalScore } from "@/lib/api/assets";

import { formatNumber, formatPercent, humanize } from "./format";

type AssetFundamentalPanelProps = {
  fundamentals: FundamentalReport[];
  latestFundamentalScore: FundamentalScore | null;
};

function latestReport(reports: FundamentalReport[]) {
  return [...reports].sort((left, right) => {
    if (right.report_year !== left.report_year) return right.report_year - left.report_year;
    return right.report_quarter - left.report_quarter;
  })[0];
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

export function AssetFundamentalPanel({
  fundamentals,
  latestFundamentalScore,
}: AssetFundamentalPanelProps) {
  const report = latestReport(fundamentals);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Fundamentals</CardTitle>
            <CardDescription>最新財報與基本面評分。</CardDescription>
          </div>
          <Badge variant="secondary">
            {humanize(latestFundamentalScore?.fundamental_rating)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Item label="EPS" value={formatNumber(report?.eps)} />
        <Item label="ROE" value={formatPercent(report?.roe)} />
        <Item label="ROA" value={formatPercent(report?.roa)} />
        <Item label="Revenue YoY" value={formatPercent(report?.revenue_yoy_percent)} />
        <Item label="Revenue QoQ" value={formatPercent(report?.revenue_qoq_percent)} />
        <Item label="Gross Margin" value={formatPercent(report?.gross_margin)} />
        <Item label="Operating Margin" value={formatPercent(report?.operating_margin)} />
        <Item label="Net Margin" value={formatPercent(report?.net_margin)} />
        <Item label="Debt Ratio" value={formatPercent(report?.debt_ratio)} />
        <Item label="Current Ratio" value={formatNumber(report?.current_ratio)} />
        <Item label="Free Cash Flow" value={formatNumber(report?.free_cash_flow)} />
        <Item
          label="Fundamental Score"
          value={formatNumber(latestFundamentalScore?.fundamental_score)}
        />
      </CardContent>
    </Card>
  );
}
