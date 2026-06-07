"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Asset, WatchlistItem } from "@/lib/api/watchlist";

import { marketLabel } from "./WatchlistToolbar";

type WatchlistTableProps = {
  assetsById: Map<number, Asset>;
  items: WatchlistItem[];
  selectedAssetId: number | null;
  isLoading: boolean;
  priceCountByAssetId: Map<number, number>;
  onView: (asset: Asset) => void;
  onStartSync: (assetId: number) => void;
  onStopSync: (assetId: number) => void;
  onRemove: (assetId: number) => void;
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WatchlistTable({
  assetsById,
  items,
  selectedAssetId,
  isLoading,
  priceCountByAssetId,
  onView,
  onStartSync,
  onStopSync,
  onRemove,
}: WatchlistTableProps) {
  if (isLoading && items.length === 0) {
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
          <TableHead>股票代號</TableHead>
          <TableHead>名稱</TableHead>
          <TableHead>市場</TableHead>
          <TableHead>產業</TableHead>
          <TableHead>同步</TableHead>
          <TableHead>最後同步時間</TableHead>
          <TableHead>資料筆數</TableHead>
          <TableHead className="min-w-[280px]">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={8}
              className="h-24 text-center text-[hsl(var(--muted-foreground))]"
            >
              尚未加入自選股。
            </TableCell>
          </TableRow>
        ) : null}
        {items.map((item) => {
          const asset = assetsById.get(item.asset_id);
          const isSelected = selectedAssetId === item.asset_id;

          return (
            <TableRow
              key={item.id}
              className={isSelected ? "bg-[hsl(var(--muted))]/70" : undefined}
            >
              <TableCell className="font-medium">{asset?.symbol ?? item.asset_id}</TableCell>
              <TableCell>{asset?.name ?? "-"}</TableCell>
              <TableCell>{asset ? marketLabel(asset.market) : "-"}</TableCell>
              <TableCell>{asset?.industry_id ? asset.industry_id : "待設定"}</TableCell>
              <TableCell>
                <Badge variant={item.is_sync_enabled ? "success" : "secondary"}>
                  {item.is_sync_enabled ? "同步中" : "未同步"}
                </Badge>
              </TableCell>
              <TableCell>{formatDateTime(item.last_synced_at)}</TableCell>
              <TableCell>{priceCountByAssetId.get(item.asset_id) ?? "-"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!asset || isLoading}
                    onClick={() => asset && onView(asset)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    查看資料
                  </Button>
                  <Button
                    disabled={isLoading}
                    onClick={() => onStartSync(item.asset_id)}
                    size="sm"
                    type="button"
                  >
                    開始同步
                  </Button>
                  <Button
                    disabled={isLoading}
                    onClick={() => onStopSync(item.asset_id)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    停止同步
                  </Button>
                  <Button
                    disabled={isLoading}
                    onClick={() => onRemove(item.asset_id)}
                    size="sm"
                    type="button"
                    variant="destructive"
                  >
                    移除
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
