"use client";

import type { TrackedMarket } from "@/lib/api/dashboard";

function fmtChange(value: number | null, unit: string) {
  if (value === null) return { text: "—", cls: "text-slate-400" };
  const v = Number(value.toFixed(2));
  const sign = v >= 0 ? "+" : "";
  return { text: `${sign}${v} ${unit}`, cls: v >= 0 ? "text-emerald-500" : "text-red-500" };
}

function MarketCard({ market }: { market: TrackedMarket }) {
  const ind = market.indicators[0] ?? null;
  const { text, cls } = fmtChange(ind?.value ?? null, ind?.unit ?? "%");

  return (
    <div className="flex min-w-[160px] flex-col gap-1 rounded-xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500">{market.name}</span>
        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {market.code}
        </span>
      </div>
      <span className={`text-xl font-bold tabular-nums ${cls}`}>{text}</span>
      {market.indicators.length > 1 && (
        <div className="mt-1.5 flex flex-col gap-0.5">
          {market.indicators.slice(1).map((i) => {
            const { text: t, cls: c } = fmtChange(i.value, i.unit);
            return (
              <div key={i.field_key} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{i.display_name}</span>
                <span className={`font-semibold ${c}`}>{t}</span>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-0.5 text-[10px] text-slate-400">{market.currency}</p>
    </div>
  );
}

type Props = { markets: TrackedMarket[] };

export function TrackedMarketsBar({ markets }: Props) {
  if (markets.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {markets.map((m) => (
        <MarketCard key={m.code} market={m} />
      ))}
    </div>
  );
}
