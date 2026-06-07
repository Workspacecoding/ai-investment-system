"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AssetScore } from "@/lib/api/assets";

import { formatNumber, humanize } from "./format";

type AssetScorePanelProps = {
  score: AssetScore | null;
};

function ratingVariant(rating: string | undefined) {
  if (rating === "strong_buy" || rating === "buy") return "success";
  if (rating === "watch") return "warning";
  if (rating === "avoid") return "destructive";
  return "secondary";
}

function ScoreItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

export function AssetScorePanel({ score }: AssetScorePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Score</CardTitle>
            <CardDescription>綜合評分與版本資訊。</CardDescription>
          </div>
          <Badge variant={ratingVariant(score?.rating)}>{humanize(score?.rating)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ScoreItem label="Final Score" value={formatNumber(score?.final_score)} />
        <ScoreItem label="Market Score" value={formatNumber(score?.market_score)} />
        <ScoreItem label="Industry Score" value={formatNumber(score?.industry_score)} />
        <ScoreItem label="Factor Score" value={formatNumber(score?.factor_score)} />
        <ScoreItem label="Price Level Score" value={formatNumber(score?.price_level_score)} />
        <ScoreItem label="Fundamental Score" value={formatNumber(score?.fundamental_score)} />
        <ScoreItem label="Sentiment Score" value={formatNumber(score?.sentiment_score)} />
        <ScoreItem label="Scoring Version" value={score?.scoring_version ?? "尚無資料"} />
      </CardContent>
    </Card>
  );
}
