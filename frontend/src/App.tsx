import { Route, Routes } from "react-router-dom";


const modules = [
  "市場判斷",
  "ETF 分析",
  "新聞情緒分析",
  "產業動能",
  "指標因子池",
  "檔位判斷",
  "策略引擎",
  "Trade Plan",
  "風控",
  "獲利分配",
  "電子報",
  "模擬交易",
  "回測"
];


function HomePage() {
  return (
    <main className="app-shell">
      <section className="intro">
        <p className="eyebrow">AI Investment System</p>
        <h1>投資研究、策略判斷與交易計畫平台</h1>
        <p>
          整合市場資料、AI 分析、策略引擎、風控與回測流程，作為前後端功能開發的起始骨架。
        </p>
      </section>

      <section className="module-grid" aria-label="核心模組">
        {modules.map((module) => (
          <article className="module-card" key={module}>
            <span>{module}</span>
          </article>
        ))}
      </section>
    </main>
  );
}


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}
