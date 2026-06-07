import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StrategyPerformance } from "@/lib/api/reports";

import { num, percent } from "./format";

type StrategyPerformanceTableProps = {
  items: StrategyPerformance[];
  isLoading: boolean;
};

export function StrategyPerformanceTable({ isLoading, items }: StrategyPerformanceTableProps) {
  const chartData = items.map((item) => ({
    name: item.strategy_type,
    netReturn: num(item.net_return_percent),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Strategy Performance</CardTitle>
        <CardDescription>各策略交易數、勝率與淨報酬表現。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {items.length > 0 ? (
          <div className="h-52">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="netReturn" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Strategy Type</TableHead>
                <TableHead>Total Trades</TableHead>
                <TableHead>Win Rate</TableHead>
                <TableHead>Avg Profit %</TableHead>
                <TableHead>Avg Loss %</TableHead>
                <TableHead>Net Return %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-[hsl(var(--muted-foreground))]">
                    尚無策略績效資料。
                  </TableCell>
                </TableRow>
              ) : null}
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.strategy_type}</TableCell>
                  <TableCell>{item.total_trades}</TableCell>
                  <TableCell>{percent(item.win_rate)}</TableCell>
                  <TableCell>{percent(item.avg_profit_percent)}</TableCell>
                  <TableCell>{percent(item.avg_loss_percent)}</TableCell>
                  <TableCell>{percent(item.net_return_percent)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
