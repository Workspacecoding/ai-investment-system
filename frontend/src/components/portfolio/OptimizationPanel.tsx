"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PortfolioOptimizationView } from "@/lib/api/portfolio";

import { formatPercent, pnlClass } from "./format";

type OptimizationPanelProps = {
  optimization: PortfolioOptimizationView | null;
};

export function OptimizationPanel({ optimization }: OptimizationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Portfolio Optimization</CardTitle>
            <CardDescription>
              {optimization?.portfolio_name ?? "尚無最佳化配置建議。"}
            </CardDescription>
          </div>
          {optimization ? (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{optimization.strategy_type}</Badge>
              <Badge variant="secondary">{optimization.risk_level}</Badge>
              <Badge variant="secondary">Sharpe {optimization.expected_sharpe.toFixed(2)}</Badge>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Current %</TableHead>
              <TableHead>Target %</TableHead>
              <TableHead>Difference</TableHead>
              <TableHead>Recommendation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!optimization || optimization.assets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-[hsl(var(--muted-foreground))]"
                >
                  尚無最佳化配置資料。
                </TableCell>
              </TableRow>
            ) : null}
            {optimization?.assets.map((asset) => (
              <TableRow key={asset.asset_id}>
                <TableCell>
                  <p className="font-medium">{asset.symbol}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{asset.name}</p>
                </TableCell>
                <TableCell>{formatPercent(asset.current_percent)}</TableCell>
                <TableCell>{formatPercent(asset.target_percent)}</TableCell>
                <TableCell className={pnlClass(asset.difference)}>
                  {formatPercent(asset.difference)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{asset.recommendation}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
