"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { SwingSetup } from "@/lib/api/swing";
import type { Asset } from "@/lib/api/watchlist";

import { SwingScoreBadge } from "./SwingScoreBadge";
import { confidenceLabel, setupTypeLabel } from "./SwingToolbar";

type SwingSetupDetailProps = {
  setup: SwingSetup | null;
  asset: Asset | null;
};

function money(value: number | string) {
  return Number(value).toFixed(2);
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

export function SwingSetupDetail({ setup, asset }: SwingSetupDetailProps) {
  if (!setup) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Swing Setup Detail</CardTitle>
          <CardDescription>選擇一筆波段交易資料查看完整買賣規劃。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-[hsl(var(--muted))] p-4 text-sm text-[hsl(var(--muted-foreground))]">
            尚未選擇 setup。
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{asset?.symbol ?? setup.asset_id}</CardTitle>
        <CardDescription>{asset?.name ?? "Swing setup detail"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{setupTypeLabel(setup.setup_type)}</Badge>
          <SwingScoreBadge score={setup.swing_score} />
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
        </div>

        <Separator />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailItem label="Current Price" value={money(setup.current_price)} />
          <DetailItem
            label="Entry Zone"
            value={`${money(setup.entry_zone_low)} ~ ${money(setup.entry_zone_high)}`}
          />
          <DetailItem label="Add Zone 1" value={money(setup.add_zone_1)} />
          <DetailItem label="Add Zone 2" value={money(setup.add_zone_2)} />
          <DetailItem label="Stop Loss" value={money(setup.stop_loss_price)} />
          <DetailItem label="Target Price 1" value={money(setup.target_price_1)} />
          <DetailItem label="Target Price 2" value={money(setup.target_price_2)} />
          <DetailItem label="Expected Holding Days" value={setup.expected_holding_days} />
        </div>

        <div className="rounded-md border p-4">
          <p className="text-sm font-medium">Reason</p>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            {setup.reason}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
