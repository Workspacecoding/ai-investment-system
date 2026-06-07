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
import type { AssetLookup, PaperTradeLog } from "@/lib/api/reports";

import { assetLabel, dateTimeLabel, money, percent } from "./format";

type TradeLogsTableProps = {
  items: PaperTradeLog[];
  assets: AssetLookup[];
  isLoading: boolean;
};

export function TradeLogsTable({ assets, isLoading, items }: TradeLogsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trade Logs</CardTitle>
        <CardDescription>模擬交易已實現損益與持有天數紀錄。</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && items.length === 0 ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Strategy Type</TableHead>
                  <TableHead>Buy Order</TableHead>
                  <TableHead>Sell Order</TableHead>
                  <TableHead>Realized PnL</TableHead>
                  <TableHead>Realized PnL %</TableHead>
                  <TableHead>Holding Days</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-20 text-center text-[hsl(var(--muted-foreground))]">
                      尚無交易紀錄。
                    </TableCell>
                  </TableRow>
                ) : null}
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{assetLabel(item.asset_id, assets)}</TableCell>
                    <TableCell>{item.strategy_type ?? "-"}</TableCell>
                    <TableCell>{item.buy_order_id ? `#${item.buy_order_id}` : "-"}</TableCell>
                    <TableCell>{item.sell_order_id ? `#${item.sell_order_id}` : "-"}</TableCell>
                    <TableCell>{money(item.realized_pnl)}</TableCell>
                    <TableCell>{percent(item.realized_pnl_percent)}</TableCell>
                    <TableCell>{item.holding_days}</TableCell>
                    <TableCell>{dateTimeLabel(item.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
