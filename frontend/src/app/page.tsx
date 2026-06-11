import Link from "next/link";

/* ─── Feature data ─────────────────────────────────────────── */
const features = [
  {
    emoji: "🎯",
    color: "from-indigo-500 to-purple-500",
    bg: "bg-indigo-50",
    title: "AI 四維評分引擎",
    desc: "整合 Market × Industry × Factor × Price Level 四個維度，每日自動輸出評分與 BUY / WATCH / HOLD / AVOID 建議。",
  },
  {
    emoji: "📈",
    color: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
    title: "Swing Trading 引擎",
    desc: "篩選高信心度 Swing Setup，自動給出進場區間、加碼區、停損價與目標價，策略清晰不靠感覺。",
  },
  {
    emoji: "💼",
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    title: "Portfolio 管理",
    desc: "模擬下單、即時追蹤持股損益、資產配置比例，搭配最佳化演算法讓資金使用更有效率。",
  },
  {
    emoji: "🎯",
    color: "from-pink-500 to-rose-500",
    bg: "bg-pink-50",
    title: "目標規劃 & 日報",
    desc: "設定財務目標後系統自動計算所需年化報酬率與配置比例，並每日產生投資日報推送通知。",
  },
];

const steps = [
  {
    n: "01",
    title: "建立帳號 & 設定自選股",
    desc: "免費註冊後新增想追蹤的股票，系統自動從 Yahoo Finance 同步近 10 年歷史資料。",
  },
  {
    n: "02",
    title: "AI 每日評分 & 推薦",
    desc: "每日 08:00 自動計算市場狀態、各股評分，篩選出今日最佳 Swing 機會。",
  },
  {
    n: "03",
    title: "追蹤目標 & 優化 Portfolio",
    desc: "設定理財目標，系統給出配置建議並監控進度，幫你把每筆資金放在最對的地方。",
  },
];

const stats = [
  { value: "20+", label: "評分指標維度" },
  { value: "10Y", label: "Yahoo 歷史資料" },
  { value: "日報", label: "每日自動產生" },
  { value: "即時", label: "真實市場報價" },
];

/* ─── Page ─────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="flex flex-col overflow-x-hidden">

      {/* ════════════════════════════════════════════════════════
          HERO — dark background
      ════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-[88vh] bg-slate-950 flex flex-col items-center justify-center px-4 py-24 text-white overflow-hidden"
        style={{ isolation: "isolate" }}
      >
        {/* dot-grid overlay */}
        <div className="hero-grid absolute inset-0 opacity-60" aria-hidden />

        {/* glow orbs */}
        <div
          aria-hidden
          className="animate-glow-pulse pointer-events-none absolute -top-32 left-1/4 h-[520px] w-[520px] -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.45) 0%, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="animate-glow-pulse delay-300 pointer-events-none absolute -bottom-32 right-1/4 h-[400px] w-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)" }}
        />

        {/* content */}
        <div className="relative z-10 mx-auto max-w-3xl text-center">

          <span className="animate-fade-in inline-block rounded-full border border-indigo-400/40 bg-indigo-500/10 px-4 py-1 text-xs font-medium text-indigo-300 tracking-wider uppercase">
            Beta — 現在免費使用
          </span>

          <h1 className="animate-fade-in-up delay-100 mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl md:text-7xl">
            智慧投資，<br />
            <span className="gradient-text">洞見先機</span>
          </h1>

          <p className="animate-fade-in-up delay-200 mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
            AlphaLens 整合 AI 評分引擎、Swing Trading 策略、Portfolio 管理與財務目標規劃，
            讓每個投資決策都有數據支撐。
          </p>

          <div className="animate-fade-in-up delay-300 mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="btn-gradient w-full rounded-xl px-8 py-3.5 text-sm sm:w-auto"
            >
              免費開始使用 →
            </Link>
            <Link
              href="/login"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-medium text-white backdrop-blur hover:bg-white/10 transition-colors sm:w-auto"
            >
              已有帳號？登入
            </Link>
          </div>

          {/* mini stats row */}
          <div className="animate-fade-in-up delay-400 mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {stats.map((s) => (
              <div className="text-center" key={s.label}>
                <div className="text-xl font-bold text-indigo-400">{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* bottom fade */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-24"
          style={{ background: "linear-gradient(to bottom, transparent, rgb(2,6,23))" }}
        />
      </section>


      {/* ════════════════════════════════════════════════════════
          FEATURES
      ════════════════════════════════════════════════════════ */}
      <section className="bg-white px-4 py-24">
        <div className="mx-auto max-w-5xl">

          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              一個平台，覆蓋完整投資流程
            </h2>
            <p className="mt-3 text-sm text-slate-500 sm:text-base">
              從選股到目標達成，每個環節都有工具支援。
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {features.map((feat, i) => (
              <div
                key={feat.title}
                className={`feature-card animate-fade-in-up rounded-2xl border border-slate-100 bg-white p-7 shadow-sm delay-${(i + 1) * 100}`}
              >
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${feat.bg} text-xl`}>
                  {feat.emoji}
                </div>
                {/* colored top accent */}
                <div className={`mb-3 h-0.5 w-8 rounded-full bg-gradient-to-r ${feat.color}`} />
                <h3 className="mb-2 text-base font-semibold text-slate-900">{feat.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════ */}
      <section className="bg-slate-50 px-4 py-24">
        <div className="mx-auto max-w-4xl">

          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">三步驟開始投資</h2>
            <p className="mt-3 text-sm text-slate-500">設定一次，每日自動產出洞察。</p>
          </div>

          <div className="mt-12 flex flex-col gap-6 md:flex-row">
            {steps.map((step, i) => (
              <div
                key={step.n}
                className={`animate-fade-in-up delay-${(i + 1) * 100} flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm`}
              >
                <span className="mb-3 font-mono text-3xl font-extrabold text-indigo-100">
                  {step.n}
                </span>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════════════════════
          CTA BANNER
      ════════════════════════════════════════════════════════ */}
      <section className="px-4 py-24">
        <div
          className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl px-8 py-16 text-center text-white"
          style={{
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)",
          }}
        >
          {/* shimmer overlay */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{
              background: "radial-gradient(circle at 30% 40%, rgba(255,255,255,0.12), transparent 60%)",
            }}
          />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold sm:text-3xl">準備好開始了嗎？</h2>
            <p className="mt-3 text-sm text-indigo-200 sm:text-base">
              免費建立帳號，立即體驗 AI 投資分析系統。
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="w-full rounded-xl bg-white px-8 py-3 text-sm font-semibold text-indigo-600 shadow-md transition-opacity hover:opacity-90 sm:w-auto"
              >
                免費註冊
              </Link>
              <Link
                href="/login"
                className="w-full rounded-xl border border-white/30 px-8 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors sm:w-auto"
              >
                登入
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════ */}
      <footer className="border-t border-slate-100 bg-white px-4 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <svg fill="none" height="20" viewBox="0 0 36 36" width="20" aria-hidden>
              <circle cx="18" cy="18" r="16" stroke="#6366f1" strokeWidth="2.2" />
              <ellipse cx="18" cy="18" rx="9" ry="5.5" stroke="#6366f1" strokeWidth="1.8" />
              <circle cx="18" cy="18" r="2.8" fill="#6366f1" />
            </svg>
            Alpha<span className="text-indigo-500">Lens</span>
          </div>
          <p className="text-xs text-slate-400 text-center">
            © 2026 AlphaLens. 投資有風險，本系統僅供參考，不構成投資建議。
          </p>
          <div className="flex gap-4 text-xs text-slate-400">
            <Link href="/login" className="hover:text-slate-600 transition-colors">登入</Link>
            <Link href="/register" className="hover:text-slate-600 transition-colors">註冊</Link>
            <Link href="/dashboard" className="hover:text-slate-600 transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
