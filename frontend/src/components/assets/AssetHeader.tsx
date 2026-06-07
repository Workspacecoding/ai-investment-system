"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AssetDetail } from "@/lib/api/assets";

import { humanize } from "./format";

type AssetHeaderProps = {
  asset: AssetDetail | null;
  isInWatchlist: boolean;
};

function marketLabel(value: string | undefined) {
  if (value === "TW") return "台股";
  if (value === "US") return "美股";
  if (value === "CRYPTO") return "Crypto";
  return value ?? "尚無資料";
}

export function AssetHeader({ asset, isInWatchlist }: AssetHeaderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{asset?.symbol ?? "Asset Detail"}</CardTitle>
        <CardDescription>{asset?.name ?? "找不到該股票資料。"}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Badge variant="secondary">{marketLabel(asset?.market)}</Badge>
        <Badge variant="secondary">{humanize(asset?.asset_type)}</Badge>
        <Badge variant="secondary">Industry {asset?.industry_id ?? "尚無資料"}</Badge>
        <Badge variant={asset?.is_active ? "success" : "secondary"}>
          {asset?.is_active ? "Active" : "Inactive"}
        </Badge>
        <Badge variant={asset?.data_sync_enabled ? "success" : "warning"}>
          {asset?.data_sync_enabled ? "同步中" : "未同步"}
        </Badge>
        <Badge variant={isInWatchlist ? "success" : "secondary"}>
          {isInWatchlist ? "自選股" : "非自選股"}
        </Badge>
      </CardContent>
    </Card>
  );
}
