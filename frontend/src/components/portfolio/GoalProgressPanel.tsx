"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { GoalProgress } from "@/lib/api/portfolio";

import { formatMoney, formatPercent } from "./format";

type GoalProgressPanelProps = {
  goalProgress: GoalProgress | null;
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

export function GoalProgressPanel({ goalProgress }: GoalProgressPanelProps) {
  const progress = goalProgress?.progress_percent ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Goal Progress</CardTitle>
        <CardDescription>目標資產進度與成功機率。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!goalProgress ? (
          <div className="rounded-md border bg-[hsl(var(--muted))] p-4 text-sm text-[hsl(var(--muted-foreground))]">
            尚無目標策略資料。
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>完成度</span>
                <span>{formatPercent(progress)}</span>
              </div>
              <Progress value={progress} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label="目前資產" value={formatMoney(goalProgress.current_value)} />
              <Metric label="目標資產" value={formatMoney(goalProgress.target_value)} />
              <Metric label="完成度" value={formatPercent(goalProgress.progress_percent)} />
              <Metric
                label="預估達成日期"
                value={goalProgress.estimated_target_date ?? "尚無資料"}
              />
              <Metric label="成功機率" value={formatPercent(goalProgress.probability_score)} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
