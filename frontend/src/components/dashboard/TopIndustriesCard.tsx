"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { IndustryMomentumRow, MarketDashboard } from "@/lib/api/dashboard";

type Props = { data: MarketDashboard | null; isLoading: boolean };

function MomentumBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-slate-400">—</span>;
  const pct = Math.min(Math.max(score * 100, 0), 100);
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-indigo-500" : pct >= 30 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-slate-700 w-9 text-right">
        {(score * 100).toFixed(1)}
      </span>
    </div>
  );
}

function IndustryRow({ row, rank, isTracked }: { row: IndustryMomentumRow; rank?: number; isTracked?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 hover:bg-slate-50/60 rounded-lg transition-colors">
      {rank !== undefined ? (
        <span className={[
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          rank === 1 ? "bg-amber-100 text-amber-700" :
          rank === 2 ? "bg-slate-100 text-slate-600" :
          rank === 3 ? "bg-orange-50 text-orange-600" : "bg-slate-50 text-slate-400"
        ].join(" ")}>
          {rank}
        </span>
      ) : (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-500">
          追
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{row.industry_name}</p>
        <p className="text-[11px] text-slate-400">{row.industry_code}</p>
      </div>
      <MomentumBar score={row.momentum_score} />
    </div>
  );
}

export function TopIndustriesCard({ data, isLoading }: Props) {
  if (isLoading && !data) return <Skeleton className="h-64 w-full" />;

  const top = data?.top_industries ?? [];
  const tracked = data?.tracked_industries ?? [];

  // Remove duplicates from tracked that are already in top
  const topIds = new Set(top.map((t) => t.industry_id));
  const trackedExtra = tracked.filter((t) => !topIds.has(t.industry_id));

  const empty = top.length === 0 && trackedExtra.length === 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">產業動能</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 px-2">
        {empty ? (
          <p className="px-3 py-4 text-sm text-slate-400 text-center">尚無產業動能資料。</p>
        ) : null}

        {top.length > 0 ? (
          <div>
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              TOP 3 產業
            </p>
            {top.slice(0, 3).map((row, i) => (
              <IndustryRow key={row.industry_id} row={row} rank={i + 1} />
            ))}
          </div>
        ) : null}

        {trackedExtra.length > 0 ? (
          <div className={top.length > 0 ? "mt-3 border-t border-slate-100 pt-3" : ""}>
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              追蹤產業
            </p>
            {trackedExtra.map((row) => (
              <IndustryRow key={row.industry_id} row={row} isTracked />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
