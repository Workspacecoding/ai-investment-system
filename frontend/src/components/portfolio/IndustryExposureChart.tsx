"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { IndustryExposureItem } from "@/lib/api/portfolio";

import { formatMoney, formatPercent } from "./format";

type IndustryExposureChartProps = {
  data: IndustryExposureItem[];
};

const COLORS = ["#0ea5e9", "#6366f1", "#14b8a6", "#84cc16", "#f97316", "#64748b"];

export function IndustryExposureChart({ data }: IndustryExposureChartProps) {
  const filteredData = data.filter((item) => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Industry Exposure</CardTitle>
        <CardDescription>產業曝險分布</CardDescription>
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
              <Tooltip formatter={(value) => formatMoney(Number(value))} />
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
                {formatPercent(item.percent)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
