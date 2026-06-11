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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardGoalSummary } from "@/lib/api/dashboard";

import { formatMoney, formatPercent } from "./format";

type GoalSummaryCardProps = {
  goal: DashboardGoalSummary | null;
  isLoading: boolean;
};

export function GoalSummaryCard({ goal, isLoading }: GoalSummaryCardProps) {
  if (isLoading && !goal) return <Skeleton className="h-52 w-full" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">目標摘要</CardTitle>
            <CardDescription>財務目標進度與達成機率</CardDescription>
          </div>
          <Link
            className={buttonVariants({ size: "sm", variant: "outline" })}
            href="/dashboard/goal-planner"
          >
            前往目標規劃
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!goal ? (
          <div className="rounded-md border bg-[hsl(var(--muted))] p-3 text-sm text-[hsl(var(--muted-foreground))]">
            尚無目標策略。
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>進度</span>
                <span>{formatPercent(goal.progress_percent)}</span>
              </div>
              <Progress value={goal.progress_percent} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="目前資金" value={formatMoney(goal.current_capital)} />
              <Metric label="目標資金" value={formatMoney(goal.target_capital)} />
              <Metric label="達成機率" value={formatPercent(goal.probability_score)} />
            </div>
          </>
        )}
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
