"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SwingSetup } from "@/lib/api/assets";

import { formatNumber, humanize } from "./format";

type AssetSwingPanelProps = {
  assetId: number;
  setup: SwingSetup | null;
  isLoading: boolean;
  onGenerate: (assetId: number) => void;
};

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

export function AssetSwingPanel({
  assetId,
  setup,
  isLoading,
  onGenerate,
}: AssetSwingPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Swing Setup</CardTitle>
            <CardDescription>買點、加碼、停損與目標價。</CardDescription>
          </div>
          <Button disabled={isLoading} onClick={() => onGenerate(assetId)} type="button">
            Generate Swing Setup
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!setup ? (
          <div className="rounded-md border bg-[hsl(var(--muted))] p-4 text-sm text-[hsl(var(--muted-foreground))]">
            尚無波段交易資料。
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{humanize(setup.setup_type)}</Badge>
              <Badge variant={setup.confidence_level === "high" ? "success" : "warning"}>
                {humanize(setup.confidence_level)}
              </Badge>
              <Badge variant="secondary">Score {formatNumber(setup.swing_score, 1)}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Item label="Current Price" value={formatNumber(setup.current_price)} />
              <Item
                label="Entry Zone"
                value={`${formatNumber(setup.entry_zone_low)} ~ ${formatNumber(setup.entry_zone_high)}`}
              />
              <Item label="Add Zone 1" value={formatNumber(setup.add_zone_1)} />
              <Item label="Add Zone 2" value={formatNumber(setup.add_zone_2)} />
              <Item label="Stop Loss" value={formatNumber(setup.stop_loss_price)} />
              <Item label="Target Price 1" value={formatNumber(setup.target_price_1)} />
              <Item label="Target Price 2" value={formatNumber(setup.target_price_2)} />
              <Item
                label="Expected Holding Days"
                value={`${setup.expected_holding_days} days`}
              />
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm font-medium">Reason</p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                {setup.reason}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
