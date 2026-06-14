"use client";

const sections = [
  { title: "投資組合", desc: "整體投資組合概覽與資產配置比例" },
  { title: "股票持倉", desc: "當前持有股票清單與損益狀況" },
  { title: "ETF持倉", desc: "ETF持倉明細與費用率分析" },
  { title: "基金持倉", desc: "基金持倉狀況與配息紀錄" },
  { title: "現金管理", desc: "可用現金、定存與短期資金配置" },
  { title: "資產分布", desc: "依地區、產業、類型的資產分布" },
];

export default function AssetsPage() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))]">
      <div className="mx-auto max-w-7xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">資產中心</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">全面掌握資產配置與投資組合狀況。</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
