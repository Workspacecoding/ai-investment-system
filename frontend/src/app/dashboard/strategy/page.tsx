"use client";

const sections = [
  { title: "自選股策略推薦", desc: "依據自選股清單推薦波段與檔位策略" },
  { title: "波段投資機會", desc: "系統掃描推薦的波段介入點與目標價" },
  { title: "策略模型", desc: "查看各策略模型的績效與訊號狀態" },
  { title: "股價模型", desc: "波段管理與檔位管理設定" },
];

export default function StrategyPage() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))]">
      <div className="mx-auto max-w-7xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">策略中心</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">查看策略推薦與投資機會，找到最佳進出場時機。</p>
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
