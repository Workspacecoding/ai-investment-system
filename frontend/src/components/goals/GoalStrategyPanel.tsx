"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GoalStrategy } from "@/lib/api/goals";

import { formatPercent } from "./format";

type GoalStrategyPanelProps = {
  strategy: GoalStrategy | null;
};

export function GoalStrategyPanel({ strategy }: GoalStrategyPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Goal Strategy</CardTitle>
            <CardDescription>策略類型、必要報酬與成功機率。</CardDescription>
          </div>
          <Badge variant="secondary">{strategy?.strategy_type ?? "尚無策略"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="strategy_type" value={strategy?.strategy_type ?? "尚無資料"} />
        <Metric label="risk_level" value={strategy?.risk_level ?? "尚無資料"} />
        <Metric
          label="required_annual_return"
          value={formatPercent(strategy?.required_annual_return)}
        />
        <Metric
          label="required_monthly_return"
          value={formatPercent(strategy?.required_monthly_return)}
        />
        <Metric label="probability_score" value={formatPercent(strategy?.probability_score)} />
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
