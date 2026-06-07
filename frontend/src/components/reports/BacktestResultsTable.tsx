"use client";

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
import type { AssetLookup, BacktestRun, BacktestTrade } from "@/lib/api/reports";

import { assetLabel, dateLabel, money, percent } from "./format";

type BacktestResultsTableProps = {
  backtests: BacktestRun[];
  selectedBacktestId: number | null;
  trades: BacktestTrade[];
  assets: AssetLookup[];
  isLoading: boolean;
  onSelectBacktest: (backtestRunId: number) => void;
};

export function BacktestResultsTable({
  assets,
  backtests,
  isLoading,
  onSelectBacktest,
  selectedBacktestId,
  trades,
}: BacktestResultsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Backtest Results</CardTitle>
        <CardDescription>點擊回測列可載入該次交易明細。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && backtests.length === 0 ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Strategy Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Initial Capital</TableHead>
                  <TableHead>Final Capital</TableHead>
                  <TableHead>Total Return %</TableHead>
                  <TableHead>Max Drawdown</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>Total Trades</TableHead>
                  <TableHead>Profit Factor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backtests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-20 text-center text-[hsl(var(--muted-foreground))]">
                      尚無回測結果。
                    </TableCell>
                  </TableRow>
                ) : null}
                {backtests.map((run) => (
                  <TableRow
                    className={
                      selectedBacktestId === run.id
                        ? "cursor-pointer bg-[hsl(var(--muted))]/70"
                        : "cursor-pointer"
                    }
                    key={run.id}
                    onClick={() => onSelectBacktest(run.id)}
                  >
                    <TableCell className="font-medium">{run.name}</TableCell>
                    <TableCell>{run.strategy_type}</TableCell>
                    <TableCell>{dateLabel(run.start_date)}</TableCell>
                    <TableCell>{dateLabel(run.end_date)}</TableCell>
                    <TableCell>{money(run.initial_capital)}</TableCell>
                    <TableCell>{money(run.final_capital)}</TableCell>
                    <TableCell>{percent(run.total_return_percent)}</TableCell>
                    <TableCell>{percent(run.max_drawdown)}</TableCell>
                    <TableCell>{percent(run.win_rate)}</TableCell>
                    <TableCell>{run.total_trades}</TableCell>
                    <TableCell>{Number(run.profit_factor).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div>
          <h3 className="mb-3 text-sm font-medium">Backtest Trades</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Entry Date</TableHead>
                  <TableHead>Exit Date</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Exit Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>PnL</TableHead>
                  <TableHead>PnL %</TableHead>
                  <TableHead>Holding Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-20 text-center text-[hsl(var(--muted-foreground))]">
                      尚未選擇回測，或該回測沒有交易明細。
                    </TableCell>
                  </TableRow>
                ) : null}
                {trades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell>{assetLabel(trade.asset_id, assets)}</TableCell>
                    <TableCell>{dateLabel(trade.entry_date)}</TableCell>
                    <TableCell>{dateLabel(trade.exit_date)}</TableCell>
                    <TableCell>{money(trade.entry_price)}</TableCell>
                    <TableCell>{money(trade.exit_price)}</TableCell>
                    <TableCell>{money(trade.quantity)}</TableCell>
                    <TableCell>{money(trade.pnl)}</TableCell>
                    <TableCell>{percent(trade.pnl_percent)}</TableCell>
                    <TableCell>{trade.holding_days}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
