"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MarketDashboard } from "@/lib/api/dashboard";

type Props = { data: MarketDashboard | null; isLoading: boolean };

function regimeLabel(r: string) {
  if (r === "bull") return { text: "多頭", cls: "bg-emerald-100 text-emerald-700" };
  if (r === "bear") return { text: "空頭", cls: "bg-red-100 text-red-700" };
  return { text: "盤整", cls: "bg-amber-100 text-amber-700" };
}

function indicatorColor(key: string, value: number | null) {
  if (value === null) return "text-slate-400";
  if (key.includes("change_percent") || key === "market_score") {
    return value >= 0 ? "text-emerald-600" : "text-red-500";
  }
  if (key === "vix_value") return value > 30 ? "text-red-500" : value < 15 ? "text-emerald-600" : "text-amber-600";
  return "text-slate-700";
}

function fmtValue(key: string, value: number | null, unit: string) {
  if (value === null) return "—";
  const v = Number(value.toFixed(2));
  const prefix = (key.includes("change_percent")) ? (v >= 0 ? "+" : "") : "";
  return `${prefix}${v} ${unit}`;
}

function ScoreArc({ score }: { score: number }) {
  const pct = Math.min(Math.max(score, 0), 100);
  const color = pct >= 75 ? "#10b981" : pct >= 60 ? "#6366f1" : pct >= 45 ? "#f59e0b" : pct >= 30 ? "#f97316" : "#ef4444";
  const r = 42, cx = 52, cy = 52;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ * 0.75;
  const gap = circ - dash;
  return (
    <svg width="104" height="68" viewBox="0 0 104 80">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="10"
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
        strokeDashoffset={circ * 0.875} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={circ * 0.875} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }} />
      <text x={cx} y={cy - 2} textAnchor="middle" fill={color} fontSize="20" fontWeight="700">{Math.round(pct)}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize="9">分</text>
    </svg>
  );
}

export function MarketScoreCard({ data, isLoading }: Props) {
  if (isLoading && !data) return <Skeleton className="h-64 w-full" />;

  const score = data?.market_score ?? 0;
  const regime = regimeLabel(data?.market_regime ?? "sideways");

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">市場分數</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score arc + regime + recommendation */}
        <div className="flex items-center gap-4">
          <ScoreArc score={score} />
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${regime.cls}`}>
                {regime.text}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">建議操作</p>
            <p className="text-base font-bold text-slate-900">{data?.recommendation ?? "—"}</p>
            {data?.snapshot_date ? (
              <p className="mt-0.5 text-[11px] text-slate-400">資料日期：{data.snapshot_date}</p>
            ) : null}
          </div>
        </div>

        {/* Individual indicators */}
        {data?.indicators && data.indicators.length > 0 ? (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/60">
            {data.indicators.map((ind) => (
              <div key={ind.id} className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate text-xs text-slate-600">{ind.display_name}</span>
                  {ind.description ? (
                    <span className="hidden sm:inline text-[10px] text-slate-400 truncate max-w-[120px]">
                      {ind.description.split("。")[0]}
                    </span>
                  ) : null}
                </div>
                <span className={`ml-3 shrink-0 text-sm font-semibold tabular-nums ${indicatorColor(ind.field_key, ind.value)}`}>
                  {fmtValue(ind.field_key, ind.value, ind.unit)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">尚無市場快照資料。</p>
        )}
      </CardContent>
    </Card>
  );
}
