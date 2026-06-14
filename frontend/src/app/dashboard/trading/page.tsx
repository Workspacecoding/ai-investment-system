"use client";

const sections = [
  { title: "交易計畫", desc: "建立與管理各標的的交易計畫與目標" },
  { title: "持倉管理", desc: "查看當前持倉狀態與持倉比例分配" },
  { title: "交易紀錄", desc: "所有歷史交易紀錄與損益統計" },
  { title: "待執行交易", desc: "尚未執行的預約交易與提醒清單" },
];

export default function TradingPage() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))]">
      <div className="mx-auto max-w-7xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">交易中心</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">管理實際交易操作，追蹤計畫執行狀況。</p>
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
