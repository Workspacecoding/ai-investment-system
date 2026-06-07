"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GoalStrategy } from "@/lib/api/goals";

import { formatPercent, num } from "./format";

type GoalAllocationChartProps = {
  strategy: GoalStrategy | null;
};

const COLORS = ["#2563eb", "#10b981", "#8b5cf6", "#f59e0b"];

export function GoalAllocationChart({ strategy }: GoalAllocationChartProps) {
  const data = [
    { name: "ETF", value: num(strategy?.etf_ratio) },
    { name: "Stock", value: num(strategy?.stock_ratio) },
    { name: "Crypto", value: num(strategy?.crypto_ratio) },
    { name: "Cash", value: num(strategy?.cash_ratio) },
  ];
  const filteredData = data.filter((item) => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Goal Allocation</CardTitle>
        <CardDescription>ETF / Stock / Crypto / Cash</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="h-[220px]">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie data={filteredData} dataKey="value" innerRadius={54} outerRadius={86}>
                {filteredData.map((entry, index) => (
                  <Cell fill={COLORS[index % COLORS.length]} key={entry.name} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatPercent(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div className="flex items-center justify-between rounded-md border p-3" key={item.name}>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                {formatPercent(item.value)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
