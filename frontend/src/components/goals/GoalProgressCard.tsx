"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { UserGoal } from "@/lib/api/goals";

import { formatMoney, formatPercent, num } from "./format";

type GoalProgressCardProps = {
  goal: UserGoal | null;
};

function daysLeft(targetDate: string | undefined) {
  if (!targetDate) return 0;
  const diff = new Date(targetDate).getTime() - Date.now();
  return Math.max(Math.ceil(diff / 86400000), 0);
}

export function GoalProgressCard({ goal }: GoalProgressCardProps) {
  const currentCapital = num(goal?.current_capital);
  const targetCapital = num(goal?.target_capital);
  const progress = targetCapital > 0 ? (currentCapital / targetCapital) * 100 : 0;
  const remaining = Math.max(targetCapital - currentCapital, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Goal Progress</CardTitle>
        <CardDescription>目前目標完成度。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!goal ? (
          <div className="rounded-md border bg-[hsl(var(--muted))] p-4 text-sm text-[hsl(var(--muted-foreground))]">
            尚未設定投資目標。請先建立你的第一個目標。
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>完成度</span>
                <span>{formatPercent(progress)}</span>
              </div>
              <Progress value={progress} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Metric label="目前本金" value={formatMoney(currentCapital)} />
              <Metric label="目標金額" value={formatMoney(targetCapital)} />
              <Metric label="目標日期" value={goal.target_date} />
              <Metric label="剩餘金額" value={formatMoney(remaining)} />
              <Metric label="剩餘天數" value={`${daysLeft(goal.target_date)} 天`} />
              <Metric label="完成度" value={formatPercent(progress)} />
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
