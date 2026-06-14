"use client";

const sections = [
  { title: "績效分析", desc: "投資組合歷史績效、年化報酬與波動率" },
  { title: "模型分析", desc: "各評分模型準確度與因子貢獻分析" },
  { title: "策略分析", desc: "各交易策略的勝率、平均報酬與風險指標" },
  { title: "回測分析", desc: "策略歷史回測結果與參數優化" },
  { title: "交易回顧", desc: "逐筆交易復盤，分析決策品質" },
];

export default function AnalysisPage() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))]">
      <div className="mx-auto max-w-7xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">分析中心</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">深度回顧歷史表現，持續優化投資決策。</p>
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
