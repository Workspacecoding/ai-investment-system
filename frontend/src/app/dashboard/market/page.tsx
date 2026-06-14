"use client";

const sections = [
  { title: "市場分數", desc: "各大市場當前評分與趨勢方向" },
  { title: "市場排行", desc: "全球市場評分排行榜" },
  { title: "產業排行", desc: "各產業評分與強弱對比" },
  { title: "標的排行", desc: "各標的評分排行與篩選" },
];

export default function MarketPage() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))]">
      <div className="mx-auto max-w-7xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">市場中心</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">查看市場與產業總覽資訊，掌握整體趨勢。</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sections.map((s) => (
            <div key={s.title} className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">{s.title}</h2>
              <p className="mt-1 text-sm text-slate-400">{s.desc}</p>
              <span className="mt-4 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-400">建置中</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
