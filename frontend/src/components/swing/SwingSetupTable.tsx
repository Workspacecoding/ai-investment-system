"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SwingSetup } from "@/lib/api/swing";
import type { Asset } from "@/lib/api/watchlist";

import { GenerateSwingSetupButton } from "./GenerateSwingSetupButton";
import { SwingScoreBadge } from "./SwingScoreBadge";
import { confidenceLabel, marketLabel, setupTypeLabel } from "./SwingToolbar";

type SwingSetupTableProps = {
  setups: SwingSetup[];
  assetsById: Map<number, Asset>;
  selectedSetupId: number | null;
  isLoading: boolean;
  onView: (setup: SwingSetup) => void;
  onGenerate: (assetId: number) => void;
};

function money(value: number | string) {
  return Number(value).toFixed(2);
}

function zone(low: number | string, high: number | string) {
  return `${money(low)} ~ ${money(high)}`;
}

export function SwingSetupTable({
  setups,
  assetsById,
  selectedSetupId,
  isLoading,
  onView,
  onGenerate,
}: SwingSetupTableProps) {
  if (isLoading && setups.length === 0) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Market</TableHead>
          <TableHead>Current Price</TableHead>
          <TableHead>Entry Zone</TableHead>
          <TableHead>Add Zone 1</TableHead>
          <TableHead>Add Zone 2</TableHead>
          <TableHead>Stop Loss</TableHead>
          <TableHead>Target 1</TableHead>
          <TableHead>Target 2</TableHead>
          <TableHead>Swing Score</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead>Setup Type</TableHead>
          <TableHead>Expected Holding Days</TableHead>
          <TableHead className="min-w-[180px]">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {setups.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={15}
              className="h-28 text-center text-[hsl(var(--muted-foreground))]"
            >
              尚無波段交易資料。請先到 Watchlist 加入股票並同步價格資料。
            </TableCell>
          </TableRow>
        ) : null}
        {setups.map((setup) => {
          const asset = assetsById.get(setup.asset_id);
          const isSelected = selectedSetupId === setup.id;

          return (
            <TableRow
              key={setup.id}
              className={isSelected ? "bg-[hsl(var(--muted))]/70" : undefined}
            >
              <TableCell className="font-medium">
                <Link
                  className="hover:underline"
                  href={`/dashboard/assets/${setup.asset_id}`}
                >
                  {asset?.symbol ?? setup.asset_id}
                </Link>
              </TableCell>
              <TableCell>{asset?.name ?? "-"}</TableCell>
              <TableCell>{asset ? marketLabel(asset.market) : "-"}</TableCell>
              <TableCell>{money(setup.current_price)}</TableCell>
              <TableCell>{zone(setup.entry_zone_low, setup.entry_zone_high)}</TableCell>
              <TableCell>{money(setup.add_zone_1)}</TableCell>
              <TableCell>{money(setup.add_zone_2)}</TableCell>
              <TableCell>{money(setup.stop_loss_price)}</TableCell>
              <TableCell>{money(setup.target_price_1)}</TableCell>
              <TableCell>{money(setup.target_price_2)}</TableCell>
              <TableCell>
                <SwingScoreBadge score={setup.swing_score} />
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    setup.confidence_level === "high"
                      ? "success"
                      : setup.confidence_level === "medium"
                        ? "warning"
                        : "secondary"
                  }
                >
                  {confidenceLabel(setup.confidence_level)}
                </Badge>
              </TableCell>
              <TableCell>{setupTypeLabel(setup.setup_type)}</TableCell>
              <TableCell>{setup.expected_holding_days}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className={buttonVariants({
                      size: "sm",
                      className: isLoading ? "pointer-events-none opacity-50" : "",
                    })}
                    href={`/dashboard/assets/${setup.asset_id}`}
                  >
                    查看詳情
                  </Link>
                  <Button
                    disabled={isLoading}
                    onClick={() => onView(setup)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Setup
                  </Button>
                  <GenerateSwingSetupButton
                    assetId={setup.asset_id}
                    disabled={isLoading}
                    onGenerate={onGenerate}
                  />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
