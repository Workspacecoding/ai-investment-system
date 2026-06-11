"use client";

import type { TrackedMarket } from "@/lib/api/dashboard";

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
  const prefix = key.includes("change_percent") ? (v >= 0 ? "+" : "") : "";
  return `${prefix}${v} ${unit}`;
}

function ScoreArc({ score }: { score: number }) {
  const pct = Math.min(Math.max(score, 0), 100);
  const color =
    pct >= 75 ? "#10b981" : pct >= 60 ? "#6366f1" : pct >= 45 ? "#f59e0b" : pct >= 30 ? "#f97316" : "#ef4444";
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
      <text x={cx} y={cy - 2} textAnchor="middle" fill={color} fontSize="20" fontWeight="700">
        {Math.round(pct)}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize="9">分</text>
    </svg>
  );
}

type Props = { market: TrackedMarket };

export function TrackedMarketPanel({ market }: Props) {
  const regime = regimeLabel(market.market_regime ?? "sideways");
  const score = market.market_score ?? 0;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{market.name}</h3>
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          {market.code}
        </span>
      </div>

      {/* Score section */}
      <div className="flex items-center gap-4">
        <ScoreArc score={score} />
        <div>
          <p className="text-xs font-medium text-slate-500">市場分數</p>
          <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${regime.cls}`}>
            {regime.text}
          </span>
          <p className="mt-1.5 text-xs text-slate-400">建議操作</p>
          <p className="text-sm font-bold text-slate-900">{market.recommendation ?? "—"}</p>
        </div>
      </div>

      {/* Indicators */}
      {market.indicators && market.indicators.length > 0 ? (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/60">
          {market.indicators.map((ind) => (
            <div key={ind.field_key} className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs text-slate-600">{ind.display_name}</span>
              <span className={`ml-3 shrink-0 text-sm font-semibold tabular-nums ${indicatorColor(ind.field_key, ind.value)}`}>
                {fmtValue(ind.field_key, ind.value, ind.unit)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">尚無指標資料。</p>
      )}

      <p className="text-[10px] text-slate-300">{market.currency}</p>
    </div>
  );
}
