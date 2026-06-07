"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PortfolioHolding } from "@/lib/api/portfolio";

import { formatMoney, formatPercent, pnlClass } from "./format";

type HoldingsTableProps = {
  holdings: PortfolioHolding[];
  isLoading: boolean;
};

export function HoldingsTable({ holdings, isLoading }: HoldingsTableProps) {
  if (isLoading && holdings.length === 0) {
    return <Skeleton className="h-72 w-full" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Avg Cost</TableHead>
          <TableHead>Current Price</TableHead>
          <TableHead>Market Value</TableHead>
          <TableHead>Unrealized PnL</TableHead>
          <TableHead>Return %</TableHead>
          <TableHead>Industry</TableHead>
          <TableHead>Weight %</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {holdings.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={10}
              className="h-28 text-center text-[hsl(var(--muted-foreground))]"
            >
              目前尚未建立投資組合。請先建立自選股並模擬交易。
            </TableCell>
          </TableRow>
        ) : null}
        {holdings.map((holding) => (
          <TableRow key={holding.asset_id}>
            <TableCell className="font-medium">
              <Link className="hover:underline" href={`/dashboard/assets/${holding.asset_id}`}>
                {holding.symbol}
              </Link>
            </TableCell>
            <TableCell>{holding.name}</TableCell>
            <TableCell>{formatMoney(holding.quantity, 4)}</TableCell>
            <TableCell>{formatMoney(holding.avg_cost)}</TableCell>
            <TableCell>{formatMoney(holding.current_price)}</TableCell>
            <TableCell>{formatMoney(holding.market_value)}</TableCell>
            <TableCell className={pnlClass(holding.unrealized_pnl)}>
              {formatMoney(holding.unrealized_pnl)}
            </TableCell>
            <TableCell className={pnlClass(holding.return_percent)}>
              {formatPercent(holding.return_percent)}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{holding.industry}</Badge>
            </TableCell>
            <TableCell>{formatPercent(holding.weight_percent)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
