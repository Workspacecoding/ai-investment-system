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
import type { TechnicalIndicator } from "@/lib/api/assets";

import { formatNumber, formatPercent } from "./format";

type AssetIndicatorTableProps = {
  indicators: TechnicalIndicator[];
};

export function AssetIndicatorTable({ indicators }: AssetIndicatorTableProps) {
  const rows = [...indicators]
    .sort((left, right) => right.trade_date.localeCompare(left.trade_date))
    .slice(0, 30);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Technical Indicators</CardTitle>
        <CardDescription>最近 30 筆技術指標。</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>trade_date</TableHead>
              <TableHead>ma5</TableHead>
              <TableHead>ma20</TableHead>
              <TableHead>ma60</TableHead>
              <TableHead>rsi14</TableHead>
              <TableHead>volume_ratio</TableHead>
              <TableHead>change_percent</TableHead>
              <TableHead>is_uptrend</TableHead>
              <TableHead>is_overbought</TableHead>
              <TableHead>is_volume_spike</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-20 text-center text-[hsl(var(--muted-foreground))]"
                >
                  尚無技術指標資料。
                </TableCell>
              </TableRow>
            ) : null}
            {rows.map((indicator) => (
              <TableRow key={indicator.id}>
                <TableCell>{indicator.trade_date}</TableCell>
                <TableCell>{formatNumber(indicator.ma5)}</TableCell>
                <TableCell>{formatNumber(indicator.ma20)}</TableCell>
                <TableCell>{formatNumber(indicator.ma60)}</TableCell>
                <TableCell>{formatNumber(indicator.rsi14)}</TableCell>
                <TableCell>{formatNumber(indicator.volume_ratio)}</TableCell>
                <TableCell>{formatPercent(indicator.change_percent)}</TableCell>
                <TableCell>
                  <Badge variant={indicator.is_uptrend ? "success" : "secondary"}>
                    {indicator.is_uptrend ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={indicator.is_overbought ? "warning" : "secondary"}>
                    {indicator.is_overbought ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={indicator.is_volume_spike ? "warning" : "secondary"}>
                    {indicator.is_volume_spike ? "Yes" : "No"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
