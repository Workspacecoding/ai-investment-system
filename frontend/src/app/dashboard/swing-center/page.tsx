"use client";

import { useEffect, useMemo, useState } from "react";

import { listSwingRecommendations } from "@/lib/api/admin";
import type { SwingRecommendation } from "@/lib/api/admin";

// ─── Mock models (mirrors admin 模型回測 data) ────────────────────────────────
const MODELS = [
  { id: "tech_growth", name: "科技成長模型", description: "台美科技股，以AI/半導體為核心，適合中長波段" },
  { id: "semiconductor", name: "半導體模型", description: "台灣半導體供應鏈，高勝率，波動較大" },
  { id: "etf_swing", name: "ETF波段模型", description: "大盤ETF為主，低風險，適合保守型波段" },
];
const TRACKED_INDUSTRIES = [
  "AI", "半導體", "金融", "航運", "電動車", "生技醫療", "雲端運算", "5G通訊",
];
const RECOMMEND_LABELS: Record<string, { color: string; badge: string }> = {
  "強烈關注": { color: "text-emerald-700", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  "可觀察":  { color: "text-amber-700",   badge: "bg-amber-50 text-amber-700 border border-amber-200" },
  "普通":    { color: "text-slate-600",   badge: "bg-slate-100 text-slate-600 border border-slate-200" },
  "不推薦":  { color: "text-rose-500",    badge: "bg-rose-50 text-rose-500 border border-rose-200" },
};

type TradePlan = {
  id: string;
  name: string;
  symbol: string;
  model: string;
  budget: string;
  entry_condition: string;
  take_profit: string;
  stop_loss: string;
  actual_entry: string;
  actual_exit: string;
  actual_result: string;
  note: string;
  created_at: string;
  status: "planning" | "open" | "closed";
};

function loadPlans(): TradePlan[] {
  try {
    const raw = localStorage.getItem("trade_plans");
    return raw ? (JSON.parse(raw) as TradePlan[]) : [];
  } catch { return []; }
}
function savePlans(plans: TradePlan[]) {
  localStorage.setItem("trade_plans", JSON.stringify(plans));
}

const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400";
const btnPrimary = "rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors";
const btnSecondary = "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors";
const btnDanger = "rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors";

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-indigo-400" : value >= 40 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-slate-700 w-8">{value.toFixed(0)}</span>
    </div>
  );
}

function emptyPlanForm(): Omit<TradePlan, "id" | "created_at"> {
  return { name: "", symbol: "", model: MODELS[0].id, budget: "", entry_condition: "", take_profit: "", stop_loss: "", actual_entry: "", actual_exit: "", actual_result: "", note: "", status: "planning" };
}

export default function TradePlanPage() {
  // Filters
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [view, setView] = useState<"recommendations" | "plans">("recommendations");

  // Swing recommendations
  const [recommendations, setRecommendations] = useState<SwingRecommendation[]>([]);
  const [loadingRec, setLoadingRec] = useState(false);

  // Trade plans
  const [plans, setPlans] = useState<TradePlan[]>([]);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<TradePlan | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm());
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  useEffect(() => { setPlans(loadPlans()); }, []);

  useEffect(() => {
    setLoadingRec(true);
    listSwingRecommendations({ limit: 30 })
      .then(r => setRecommendations(r))
      .catch(() => {})
      .finally(() => setLoadingRec(false));
  }, []);

  function toggleIndustry(ind: string) {
    setSelectedIndustries(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]);
  }

  const filteredRec = useMemo(() => {
    if (selectedIndustries.length === 0) return recommendations;
    return recommendations.filter(r => r.industry_name && selectedIndustries.some(ind => r.industry_name?.includes(ind)));
  }, [recommendations, selectedIndustries]);

  const model = MODELS.find(m => m.id === selectedModel) ?? MODELS[0];

  function openAddPlan(rec?: SwingRecommendation) {
    const base = emptyPlanForm();
    if (rec) { base.symbol = rec.symbol; base.model = selectedModel; base.name = `${rec.symbol} 波段計畫`; }
    setPlanForm(base); setEditPlan(null); setPlanFormOpen(true);
  }

  function savePlan() {
    if (!planForm.name || !planForm.symbol) return;
    const updated = editPlan
      ? plans.map(p => p.id === editPlan.id ? { ...planForm, id: editPlan.id, created_at: editPlan.created_at } : p)
      : [...plans, { ...planForm, id: String(Date.now()), created_at: new Date().toISOString().slice(0, 10) }];
    setPlans(updated); savePlans(updated); setPlanFormOpen(false);
  }

  function deletePlan(id: string) {
    if (!confirm("刪除此計畫？")) return;
    const updated = plans.filter(p => p.id !== id);
    setPlans(updated); savePlans(updated);
  }

  const planStatusMeta: Record<TradePlan["status"], { label: string; color: string }> = {
    planning: { label: "規劃中", color: "bg-slate-100 text-slate-600" },
    open:     { label: "持倉中", color: "bg-indigo-50 text-indigo-600" },
    closed:   { label: "已結束", color: "bg-emerald-50 text-emerald-600" },
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">交易計畫</h1>
          <p className="mt-1 text-sm text-slate-500">選擇模型與追蹤産業，查看系統推薦，並記錄您的交易計畫。</p>
        </div>

        {/* Model + Industry selection */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Model selection */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">選擇模型</p>
              <div className="flex flex-col gap-2">
                {MODELS.map(m => (
                  <button key={m.id} type="button" onClick={() => setSelectedModel(m.id)}
                    className={["rounded-xl border px-4 py-3 text-left transition-all", selectedModel === m.id ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"].join(" ")}>
                    <div className="flex items-center justify-between">
                      <span className={["text-sm font-semibold", selectedModel === m.id ? "text-indigo-700" : "text-slate-800"].join(" ")}>{m.name}</span>
                      {selectedModel === m.id && <span className="text-xs font-medium text-indigo-500">使用中</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">{m.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Industry selection */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">追蹤産業（可複選，空白為全部）</p>
              <div className="flex flex-wrap gap-2">
                {TRACKED_INDUSTRIES.map(ind => (
                  <button key={ind} type="button" onClick={() => toggleIndustry(ind)}
                    className={["rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", selectedIndustries.includes(ind) ? "border-indigo-300 bg-indigo-100 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50"].join(" ")}>
                    {selectedIndustries.includes(ind) ? "✓ " : ""}{ind}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">當前模型：<span className="font-medium text-slate-600">{model.name}</span></p>
            </div>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 rounded-xl bg-white border border-slate-100 p-1 shadow-sm w-fit">
          <button type="button" onClick={() => setView("recommendations")}
            className={["rounded-lg px-5 py-1.5 text-sm font-medium transition-colors", view === "recommendations" ? "bg-indigo-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"].join(" ")}>
            模型推薦
          </button>
          <button type="button" onClick={() => setView("plans")}
            className={["rounded-lg px-5 py-1.5 text-sm font-medium transition-colors", view === "plans" ? "bg-indigo-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"].join(" ")}>
            我的計畫 {plans.length > 0 && <span className="ml-1 rounded-full bg-indigo-100 text-indigo-600 px-1.5 py-0.5 text-[11px]">{plans.length}</span>}
          </button>
        </div>

        {/* ── 模型推薦 ── */}
        {view === "recommendations" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                {filteredRec.length === 0 ? "目前無推薦，請確認已設定標的池" : `共 ${filteredRec.length} 個推薦結果（模型：${model.name}）`}
              </p>
            </div>

            {loadingRec ? (
              <div className="rounded-xl border border-slate-100 bg-white py-10 text-center text-sm text-slate-400 shadow-sm">載入中…</div>
            ) : filteredRec.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-white py-10 text-center shadow-sm">
                <p className="text-sm text-slate-400">尚無推薦標的</p>
                <p className="mt-1 text-xs text-slate-300">請至「控制台 → 標的管理」啟用波段池，或在自選股加入追蹤標的</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredRec.map(rec => {
                  const recLabel = rec.label ?? "普通";
                  const labelMeta = RECOMMEND_LABELS[recLabel] ?? RECOMMEND_LABELS["普通"];
                  return (
                    <div key={rec.asset_id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-sm font-bold text-slate-900">{rec.symbol}</span>
                          <p className="text-xs text-slate-400">{rec.name}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${labelMeta.badge}`}>{recLabel}</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-16 shrink-0">市場分數</span>
                          <ScoreBar value={rec.market_score} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-16 shrink-0">産業分數</span>
                          <ScoreBar value={rec.industry_score} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-16 shrink-0">個股分數</span>
                          <ScoreBar value={rec.stock_score} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-16 shrink-0">波段分數</span>
                          <ScoreBar value={rec.swing_score} />
                        </div>
                      </div>

                      {rec.industry_name && (
                        <p className="text-[11px] text-slate-400">産業：{rec.industry_name} · {rec.market}</p>
                      )}

                      <button type="button" onClick={() => openAddPlan(rec)}
                        className="mt-auto w-full rounded-lg border border-indigo-200 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors">
                        + 新增交易計畫
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 我的計畫 ── */}
        {view === "plans" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">交易計畫紀錄保存於本機（localStorage）</p>
              <button type="button" onClick={() => openAddPlan()} className={btnPrimary}>+ 新增計畫</button>
            </div>

            {plans.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-white py-12 text-center shadow-sm">
                <p className="text-sm text-slate-400">尚無交易計畫</p>
                <p className="mt-1 text-xs text-slate-300">可從「模型推薦」快速新增，或手動建立</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {["計畫名稱", "標的", "模型", "預算", "狀態", "建立日期", "操作"].map(h => (
                        <th key={h} className="border-b border-slate-100 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map(plan => {
                      const st = planStatusMeta[plan.status];
                      const m = MODELS.find(m => m.id === plan.model);
                      return (
                        <>
                          <tr key={plan.id} className="hover:bg-slate-50/60">
                            <td className="border-b border-slate-50 px-4 py-3 font-medium text-slate-900">{plan.name}</td>
                            <td className="border-b border-slate-50 px-4 py-3 font-mono text-slate-700">{plan.symbol}</td>
                            <td className="border-b border-slate-50 px-4 py-3 text-xs text-slate-500">{m?.name ?? plan.model}</td>
                            <td className="border-b border-slate-50 px-4 py-3 text-slate-600">{plan.budget || "—"}</td>
                            <td className="border-b border-slate-50 px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>{st.label}</span></td>
                            <td className="border-b border-slate-50 px-4 py-3 text-xs text-slate-400">{plan.created_at}</td>
                            <td className="border-b border-slate-50 px-4 py-3">
                              <div className="flex gap-1.5">
                                <button type="button" onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)} className={btnSecondary.replace("px-4 py-2", "px-2 py-1 text-xs")}>
                                  {expandedPlan === plan.id ? "收起" : "詳情"}
                                </button>
                                <button type="button" onClick={() => { setPlanForm({ name: plan.name, symbol: plan.symbol, model: plan.model, budget: plan.budget, entry_condition: plan.entry_condition, take_profit: plan.take_profit, stop_loss: plan.stop_loss, actual_entry: plan.actual_entry, actual_exit: plan.actual_exit, actual_result: plan.actual_result, note: plan.note, status: plan.status }); setEditPlan(plan); setPlanFormOpen(true); }} className={btnSecondary.replace("px-4 py-2", "px-2 py-1 text-xs")}>編輯</button>
                                <button type="button" onClick={() => deletePlan(plan.id)} className={btnDanger}>刪除</button>
                              </div>
                            </td>
                          </tr>
                          {expandedPlan === plan.id && (
                            <tr key={`${plan.id}-detail`}><td colSpan={7} className="bg-slate-50/60 border-b border-slate-100 px-6 py-5">
                              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                                <div><p className="text-xs text-slate-400 mb-0.5">預計進場條件</p><p className="text-slate-700">{plan.entry_condition || "—"}</p></div>
                                <div><p className="text-xs text-slate-400 mb-0.5">停利條件</p><p className="text-slate-700">{plan.take_profit || "—"}</p></div>
                                <div><p className="text-xs text-slate-400 mb-0.5">停損條件</p><p className="text-slate-700">{plan.stop_loss || "—"}</p></div>
                                <div><p className="text-xs text-slate-400 mb-0.5">實際進場價格</p><p className="text-slate-700">{plan.actual_entry || "—"}</p></div>
                                <div><p className="text-xs text-slate-400 mb-0.5">實際出場價格</p><p className="text-slate-700">{plan.actual_exit || "—"}</p></div>
                                <div><p className="text-xs text-slate-400 mb-0.5">實際結果</p><p className="text-slate-700">{plan.actual_result || "—"}</p></div>
                                {plan.note && <div className="col-span-full"><p className="text-xs text-slate-400 mb-0.5">備註</p><p className="text-slate-700 whitespace-pre-wrap">{plan.note}</p></div>}
                              </div>
                            </td></tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Plan form modal */}
      {planFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 sticky top-0 bg-white">
              <h3 className="text-base font-semibold text-slate-900">{editPlan ? "編輯計畫" : "新增交易計畫"}</h3>
              <button type="button" onClick={() => setPlanFormOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100">✕</button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">計畫名稱 *</label>
                  <input className={inputCls} value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))} placeholder="例：台積電 2026 Q2 波段" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">標的代碼 *</label>
                  <input className={inputCls} value={planForm.symbol} onChange={e => setPlanForm(p => ({ ...p, symbol: e.target.value }))} placeholder="例：2330" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">使用模型</label>
                  <select className={inputCls} value={planForm.model} onChange={e => setPlanForm(p => ({ ...p, model: e.target.value }))}>
                    {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">預算</label>
                  <input className={inputCls} value={planForm.budget} onChange={e => setPlanForm(p => ({ ...p, budget: e.target.value }))} placeholder="例：100,000 TWD" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">狀態</label>
                  <select className={inputCls} value={planForm.status} onChange={e => setPlanForm(p => ({ ...p, status: e.target.value as TradePlan["status"] }))}>
                    <option value="planning">規劃中</option>
                    <option value="open">持倉中</option>
                    <option value="closed">已結束</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">預計進場條件</label>
                  <textarea className={inputCls} rows={2} value={planForm.entry_condition} onChange={e => setPlanForm(p => ({ ...p, entry_condition: e.target.value }))} placeholder="例：突破月線且量增" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">停利條件</label>
                  <textarea className={inputCls} rows={2} value={planForm.take_profit} onChange={e => setPlanForm(p => ({ ...p, take_profit: e.target.value }))} placeholder="例：+15% 或壓力位" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">停損條件</label>
                  <textarea className={inputCls} rows={2} value={planForm.stop_loss} onChange={e => setPlanForm(p => ({ ...p, stop_loss: e.target.value }))} placeholder="例：跌破 -5% 或支撐位" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">實際進場價格</label>
                  <input className={inputCls} value={planForm.actual_entry} onChange={e => setPlanForm(p => ({ ...p, actual_entry: e.target.value }))} placeholder="例：850.00" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">實際出場價格</label>
                  <input className={inputCls} value={planForm.actual_exit} onChange={e => setPlanForm(p => ({ ...p, actual_exit: e.target.value }))} placeholder="例：975.00" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">實際結果</label>
                  <input className={inputCls} value={planForm.actual_result} onChange={e => setPlanForm(p => ({ ...p, actual_result: e.target.value }))} placeholder="例：+14.7% / 停損出場" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">備註</label>
                <textarea className={inputCls} rows={3} value={planForm.note} onChange={e => setPlanForm(p => ({ ...p, note: e.target.value }))} placeholder="其他備注、市場觀察…" />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setPlanFormOpen(false)} className={btnSecondary}>取消</button>
                <button type="button" onClick={savePlan} disabled={!planForm.name || !planForm.symbol} className={btnPrimary}>儲存計畫</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
