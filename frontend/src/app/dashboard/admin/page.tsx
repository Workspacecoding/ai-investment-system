"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type AnalysisModel,
  type ApiConfig,
  type AssetIndicatorLink,
  type AssetRole,
  type AssetRoleLinkItem,
  type AssetRow,
  type AssetTypeConfig,
  type FactorCorrReport,
  type IndustryRow,
  type MarketConfig,
  type MarketIndicatorConfig,
  type RoleConfig,
  type ScoreFormula,
  type SymbolLookup,
  type TrackedIndustry,
  type UserAdmin,
  addTrackedIndustry,
  createAnalysisModel,
  deleteAnalysisModel,
  listAnalysisModels,
  updateAnalysisModel,
  bulkImportAssets,
  createAdminAsset,
  createApiConfig,
  createAssetRole,
  createAssetTypeConfig,
  createIndicatorConfig,
  createIndustry,
  createMarket,
  createRoleConfig,
  createScoreFormula,
  createUserAdmin,
  deleteAdminAsset,
  deleteApiConfig,
  deleteAssetRole,
  deleteAssetTypeConfig,
  deleteIndicatorConfig,
  deleteIndustry,
  deleteMarket,
  deleteRoleConfig,
  deleteScoreFormula,
  deleteUserAdmin,
  getAssetIndicators,
  getAssetRoleLinks,
  getIndustryIndicators,
  getMarketIndicators,
  listAdminAssets,
  listAdminIndustries,
  listApiConfigs,
  listAssetRoles,
  listAssetTypeConfigs,
  listFactorCorrReports,
  listIndicatorConfigs,
  listIndustriesPublic,
  listMarkets,
  listMarketsPublic,
  listRoleConfigs,
  listScoreFormulas,
  listTrackedIndustries,
  listUsersAdmin,
  lookupSymbol,
  removeTrackedIndustry,
  reorderMarket,
  setAssetIndicators,
  setAssetRoleLinks,
  setIndustryIndicators,
  setMarketIndicators,
  type AssetAnalysisConfig,
  deleteAssetPriceData,
  getAssetAnalysisConfig,
  pauseAssetSync,
  saveAssetAnalysisConfig,
  startAssetSync,
  updateAdminAsset,
  updateApiConfig,
  updateAssetRole,
  updateAssetTypeConfig,
  updateIndicatorConfig,
  updateIndustry,
  updateMarket,
  updateRoleConfig,
  updateScoreFormula,
  updateUserAdmin,
  type IndicatorDailyValue,
  type MarketScoreResult,
  type MarketScoreSnapshot,
  type MarketScoreValidation,
  calculateAndSaveMarketScore,
  getIndicatorDailyValues,
  getMarketScoreValidation,
  listMarketScoreSnapshots,
  saveIndicatorDailyValues,
  updateSnapshotReturns,
  type AssetDailyDataRow,
  type AssetCrawlerIndicatorRow,
  type ScopeType,
  listScopeCrawlerIndicators,
  addScopeCrawlerIndicator,
  updateScopeCrawlerIndicator,
  deleteScopeCrawlerIndicator,
  crawlScopeIndicatorNow,
  stopScopeCrawlerIndicator,
  startScopeCrawler,
  stopScopeCrawler,
  updateScopeCrawlerConfig,
  startCrawler,
  stopCrawler,
  updateCrawlerConfig,
  listCrawlerData,
  addCrawlerData,
  deleteCrawlerData,
  listCrawlerIndicators,
  addCrawlerIndicator,
  updateCrawlerIndicator,
  deleteCrawlerIndicator,
  crawlIndicatorNow,
  stopCrawlerIndicator,
} from "@/lib/api/admin";

// ── Shared UI helpers ─────────────────────────────────────────────────────────

const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400";
const btnPrimary = "rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors";
const btnSecondary = "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors";
const btnDanger = "rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors";

function parseJsonSafe(str: string): Record<string, unknown> | null {
  try { const v = JSON.parse(str); return typeof v === "object" && v !== null && !Array.isArray(v) ? v : null; } catch { return null; }
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="border-b border-slate-100 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-b border-slate-50 px-4 py-3 text-sm text-slate-700 ${className}`}>{children}</td>;
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function SaveCancel({ onCancel, onSave, saving }: { onCancel: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <button className={btnSecondary} onClick={onCancel} type="button">取消</button>
      <button className={btnPrimary} disabled={saving} onClick={onSave} type="button">{saving ? "儲存中…" : "儲存"}</button>
    </div>
  );
}

type ErrFn = (e: unknown) => string;
const extractErr: ErrFn = (e) => String((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? (e as Error)?.message ?? "操作失敗");

// ─────────────────────────────────────────────────────────────────────────────
// Shared: Score Rule Manager (評分管理)
// ─────────────────────────────────────────────────────────────────────────────

const SITUATION_OPTS = ["強多頭", "多頭", "偏多", "中性", "偏空", "空頭", "強空頭"];
const OPERATION_OPTS = ["積極買進", "買進", "加碼", "觀望", "減碼", "出場", "放空", "觀察"];

type ScoreRule = { id: number; score: string; situation: string; operation: string };

const DEFAULT_SCORE_RULES: ScoreRule[] = [
  { id: 1, score: "≥ 80", situation: "強多頭", operation: "積極買進" },
  { id: 2, score: "65 – 79", situation: "多頭", operation: "買進" },
  { id: 3, score: "50 – 64", situation: "偏多", operation: "加碼" },
  { id: 4, score: "40 – 49", situation: "中性", operation: "觀望" },
  { id: 5, score: "25 – 39", situation: "空頭", operation: "減碼" },
  { id: 6, score: "< 25", situation: "強空頭", operation: "出場" },
];

function ScoreRuleManager({ scope, currentModelId, selectedModel, indicators }: {
  scope: "market" | "industry" | "asset";
  currentModelId: number | null;
  selectedModel: AnalysisModel | null;
  indicators: MarketIndicatorConfig[];
}) {
  const [rulesByModel, setRulesByModel] = useState<Record<number, ScoreRule[]>>({});
  const [addForm, setAddForm] = useState({ score: "", situation: "中性", operation: "觀望" });
  const [nextId, setNextId] = useState(DEFAULT_SCORE_RULES.length + 1);
  const [err, setErr] = useState("");
  const scopeLabel = scope === "market" ? "市場" : scope === "industry" ? "產業" : "標的";

  const rules: ScoreRule[] = currentModelId !== null
    ? (rulesByModel[currentModelId] ?? DEFAULT_SCORE_RULES)
    : [];

  function updateRules(fn: (prev: ScoreRule[]) => ScoreRule[]) {
    if (currentModelId === null) return;
    setRulesByModel(prev => ({ ...prev, [currentModelId]: fn(prev[currentModelId] ?? DEFAULT_SCORE_RULES) }));
  }

  function addRule() {
    if (!addForm.score.trim()) { setErr("請輸入分數條件（例：≥ 70）"); return; }
    updateRules(prev => [...prev, { id: nextId, score: addForm.score.trim(), situation: addForm.situation, operation: addForm.operation }]);
    setNextId(n => n + 1);
    setAddForm({ score: "", situation: "中性", operation: "觀望" });
    setErr("");
  }

  function deleteRule(id: number) {
    updateRules(prev => prev.filter(r => r.id !== id));
  }

  if (currentModelId === null) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
        <p className="text-sm font-medium text-slate-500">尚未選用模型</p>
        <p className="mt-1 text-xs text-slate-400">請先至「選用模型」分頁選擇模型，評分規則將與該模型關聯</p>
      </div>
    );
  }

  const SITUATION_COLORS: Record<string, string> = {
    "強多頭": "bg-emerald-100 text-emerald-800 border-emerald-300",
    "多頭": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "偏多": "bg-teal-50 text-teal-700 border-teal-200",
    "中性": "bg-slate-100 text-slate-600 border-slate-200",
    "偏空": "bg-orange-50 text-orange-700 border-orange-200",
    "空頭": "bg-red-50 text-red-700 border-red-200",
    "強空頭": "bg-red-100 text-red-800 border-red-300",
  };

  const MODEL_STATUS_COLOR: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    testing: "bg-amber-50 text-amber-700 border-amber-200",
    disabled: "bg-slate-100 text-slate-500 border-slate-200",
  };
  const MODEL_STATUS_LABEL: Record<string, string> = { active: "啟用", testing: "測試中", disabled: "停用" };

  const fSnap = selectedModel?.formula_snapshot as Record<string, unknown> | null | undefined;
  const vSnap = selectedModel?.validation_snapshot as Record<string, unknown> | null | undefined;
  const resultIds = (fSnap?.result_indicator_ids as number[] | undefined) ?? [];
  const formulaExpr = (fSnap?.formula_expr as string | undefined) ?? null;
  const formulaEntries = (fSnap?.formula_entries as unknown[] | undefined) ?? [];
  const valIndIds = (vSnap?.validation_indicator_ids as number[] | undefined) ?? [];
  const valPeriod = (vSnap?.validation_period_days as number | undefined) ?? null;
  const valConditions = (vSnap?.validation_conditions as string | undefined) ?? null;

  const resultInds = indicators.filter(i => resultIds.includes(i.id));
  const valInds = indicators.filter(i => valIndIds.includes(i.id));

  return (
    <div className="flex flex-col gap-4">
      {/* ── Model + indicator info card ── */}
      {selectedModel && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 flex flex-col gap-3">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{selectedModel.name}</span>
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-mono text-slate-500">{selectedModel.version}</span>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${MODEL_STATUS_COLOR[selectedModel.status] ?? ""}`}>{MODEL_STATUS_LABEL[selectedModel.status] ?? selectedModel.status}</span>
          </div>
          {/* Formula info */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 flex flex-col gap-1">
              <p className="text-xs font-semibold text-slate-500">公式設定</p>
              {formulaExpr
                ? <p className="font-mono text-xs text-indigo-700 break-all">{formulaExpr}</p>
                : formulaEntries.length > 0
                  ? <p className="text-xs text-slate-500">{formulaEntries.length} 個公式條目</p>
                  : <p className="text-xs text-slate-400">未設定</p>}
              {resultInds.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="text-xs text-slate-400">輸出：</span>
                  {resultInds.map(i => (
                    <span key={i.id} className="inline-flex rounded-full bg-violet-50 border border-violet-200 px-1.5 py-0.5 text-xs text-violet-700">{i.display_name}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 flex flex-col gap-1">
              <p className="text-xs font-semibold text-slate-500">驗證設定</p>
              {valPeriod && <p className="text-xs text-slate-600">驗證期間：<span className="font-semibold">{valPeriod}</span> 天</p>}
              {valConditions && <p className="font-mono text-xs text-teal-700 break-all">條件：{valConditions}</p>}
              {valInds.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="text-xs text-slate-400">指標：</span>
                  {valInds.map(i => (
                    <span key={i.id} className="inline-flex rounded-full bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-xs text-blue-700">{i.display_name}</span>
                  ))}
                </div>
              )}
              {!valPeriod && !valConditions && valInds.length === 0 && <p className="text-xs text-slate-400">未設定</p>}
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-700">評分規則</h3>
      </div>
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr><Th>分數條件</Th><Th>{scopeLabel}情況</Th><Th>操作</Th><Th>{" "}</Th></tr>
          </thead>
          <tbody>
            {rules.map(rule => (
              <tr key={rule.id} className="hover:bg-slate-50/60">
                <Td><span className="font-mono font-semibold text-indigo-600">{rule.score}</span></Td>
                <Td>
                  <select
                    className={`${inputCls} min-w-[100px]`}
                    value={rule.situation}
                    onChange={e => updateRules(prev => prev.map(r => r.id === rule.id ? { ...r, situation: e.target.value } : r))}>
                    {SITUATION_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {SITUATION_COLORS[rule.situation] && (
                    <span className={`ml-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${SITUATION_COLORS[rule.situation] ?? ""}`}>{rule.situation}</span>
                  )}
                </Td>
                <Td>
                  <select
                    className={`${inputCls} min-w-[100px]`}
                    value={rule.operation}
                    onChange={e => updateRules(prev => prev.map(r => r.id === rule.id ? { ...r, operation: e.target.value } : r))}>
                    {OPERATION_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Td>
                <Td><button className={btnDanger} type="button" onClick={() => deleteRule(rule.id)}>刪除</button></Td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3 flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">分數條件</label>
            <input className={`${inputCls} w-32`} placeholder="如：≥ 70" value={addForm.score} onChange={e => setAddForm(p => ({ ...p, score: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">{scopeLabel}情況</label>
            <select className={inputCls} value={addForm.situation} onChange={e => setAddForm(p => ({ ...p, situation: e.target.value }))}>
              {SITUATION_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">操作</label>
            <select className={inputCls} value={addForm.operation} onChange={e => setAddForm(p => ({ ...p, operation: e.target.value }))}>
              {OPERATION_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <button className={btnPrimary} type="button" onClick={addRule}>新增規則</button>
          {err && <p className="text-sm text-red-500">{err}</p>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: Score Module Panel
// ─────────────────────────────────────────────────────────────────────────────

const SCORE_STATUS_STYLES: Record<string, string> = {
  bull: "bg-emerald-50 text-emerald-700 border-emerald-200",
  bear: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  strong_bull: "bg-emerald-100 text-emerald-800 border-emerald-300",
  strong_bear: "bg-red-100 text-red-800 border-red-300",
};
const SCORE_STATUS_LABELS: Record<string, string> = {
  bull: "多頭", bear: "空頭", neutral: "中性", strong_bull: "強多頭", strong_bear: "強空頭",
};

function MarketScorePanel({ market }: { market: MarketConfig }) {
  const [result, setResult] = useState<MarketScoreResult | null>(null);
  const [snapshots, setSnapshots] = useState<MarketScoreSnapshot[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [err, setErr] = useState("");
  const [expanded, setExpanded] = useState(false);
  const todayStr = new Date().toISOString().split("T")[0];

  async function calculate() {
    setCalculating(true); setErr("");
    try {
      const r = await calculateAndSaveMarketScore(market.code, todayStr, true);
      setResult(r);
      const snaps = await listMarketScoreSnapshots(market.code, 10);
      setSnapshots(snaps);
    } catch (e) { setErr(extractErr(e)); } finally { setCalculating(false); }
  }

  useEffect(() => {
    if (expanded) {
      listMarketScoreSnapshots(market.code, 10).then(setSnapshots).catch(() => {});
    }
  }, [expanded, market.code]);

  const statusStyle = result ? (SCORE_STATUS_STYLES[result.status] ?? SCORE_STATUS_STYLES.neutral) : "";
  const statusLabel = result ? (SCORE_STATUS_LABELS[result.status] ?? result.status) : "";

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <button type="button" onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/60 transition-colors text-left">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 text-sm">📊</span>
          <div>
            <span className="text-sm font-semibold text-slate-800">{market.name}</span>
            <span className="ml-2 font-mono text-xs text-slate-400">{market.code}</span>
          </div>
          {result && (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-lg font-bold text-indigo-600 tabular-nums">{result.score.toFixed(1)}</span>
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyle}`}>{statusLabel}</span>
            </div>
          )}
        </div>
        <span className="text-slate-400 text-xs">{expanded ? "▲ 收起" : "▼ 展開"}</span>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 flex flex-col gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" className={btnPrimary} disabled={calculating} onClick={calculate}>
              {calculating ? "計算中…" : "立即計算評分"}
            </button>
            {err && <p className="text-sm text-red-500">{err}</p>}
            {result && (
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600 tabular-nums">{result.score.toFixed(1)}</p>
                  <p className="text-xs text-slate-400">總分</p>
                </div>
                <div className="text-center">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${statusStyle}`}>{statusLabel}</span>
                  <p className="text-xs text-slate-400 mt-1">市場情況</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-600 tabular-nums">{result.total_weight.toFixed(2)}</p>
                  <p className="text-xs text-slate-400">權重總和</p>
                </div>
              </div>
            )}
          </div>

          {result && result.breakdown.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">指標明細</p>
              <div className="flex flex-col gap-1">
                {result.breakdown.map(b => (
                  <div key={b.field_key} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="flex-1 text-sm text-slate-700">{b.display_name}</span>
                    <span className="font-mono text-xs text-slate-400 w-16 text-right tabular-nums">{b.raw_score.toFixed(2)}</span>
                    <span className="text-xs text-slate-400">×</span>
                    <span className="font-mono text-xs text-slate-500 w-10 text-right tabular-nums">{b.weight.toFixed(2)}</span>
                    <span className="font-mono text-xs font-semibold text-indigo-600 w-14 text-right tabular-nums">={b.contribution.toFixed(2)}</span>
                    {b.is_reverse && <span className="rounded bg-amber-100 px-1 py-px text-[10px] font-bold text-amber-700">↓反向</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {snapshots.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">近期評分紀錄</p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead><tr className="text-slate-400 text-xs uppercase">
                    <th className="py-1.5 pr-4 text-left font-semibold">日期</th>
                    <th className="py-1.5 pr-4 text-right font-semibold">評分</th>
                    <th className="py-1.5 pr-4 text-left font-semibold">情況</th>
                    <th className="py-1.5 pr-4 text-right font-semibold">5日報酬</th>
                    <th className="py-1.5 pr-4 text-right font-semibold">10日報酬</th>
                    <th className="py-1.5 pr-4 text-right font-semibold">命中</th>
                  </tr></thead>
                  <tbody>
                    {snapshots.map(s => {
                      const ss = SCORE_STATUS_STYLES[s.status] ?? SCORE_STATUS_STYLES.neutral;
                      const sl = SCORE_STATUS_LABELS[s.status] ?? s.status;
                      return (
                        <tr key={s.id} className="border-t border-slate-50">
                          <td className="py-1.5 pr-4 font-mono text-slate-500">{s.record_date}</td>
                          <td className="py-1.5 pr-4 text-right font-semibold text-indigo-600 tabular-nums">{s.score.toFixed(1)}</td>
                          <td className="py-1.5 pr-4"><span className={`inline-flex rounded-full border px-1.5 py-px text-[11px] font-medium ${ss}`}>{sl}</span></td>
                          <td className="py-1.5 pr-4 text-right tabular-nums text-slate-500">{s.future_return_5d != null ? `${(s.future_return_5d * 100).toFixed(1)}%` : "—"}</td>
                          <td className="py-1.5 pr-4 text-right tabular-nums text-slate-500">{s.future_return_10d != null ? `${(s.future_return_10d * 100).toFixed(1)}%` : "—"}</td>
                          <td className="py-1.5 pr-4 text-right">{s.is_hit === true ? <span className="text-emerald-600 font-semibold">✓</span> : s.is_hit === false ? <span className="text-red-400">✗</span> : <span className="text-slate-400">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Markets
// ─────────────────────────────────────────────────────────────────────────────

function MarketsTab({ onReload }: { onReload: (rows: MarketConfig[]) => void }) {
  const [rows, setRows] = useState<MarketConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [indicators, setIndicators] = useState<MarketIndicatorConfig[]>([]);
  const [allModels, setAllModels] = useState<AnalysisModel[]>([]);
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [moduleConfigMarket, setModuleConfigMarket] = useState<MarketConfig | null>(null);
  const [crawlerMarket, setCrawlerMarket] = useState<MarketConfig | null>(null);
  const [form, setForm] = useState({ code: "", name: "", currency: "", description: "" });
  const [editRow, setEditRow] = useState<MarketConfig | null>(null);
  const [editForm, setEditForm] = useState<Partial<{ name: string; currency: string; description: string; is_active: boolean; is_tracked: boolean; current_model_id: number | null }>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await listMarkets(); setRows(r); onReload(r); } catch { /* 401 or network error — show empty */ } finally { setLoading(false); }
  }, [onReload]);

  useEffect(() => {
    load();
    listIndicatorConfigs().then(r => setIndicators(r)).catch(() => {});
    listAnalysisModels().then(r => setAllModels(r)).catch(() => {});
    listApiConfigs().then(r => setApiConfigs(r)).catch(() => {});
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">新增市場</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <input className={inputCls} placeholder="代碼 如 TW" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
          <input className={inputCls} placeholder="名稱 如 台灣股市" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <input className={inputCls} placeholder="幣別 如 TWD" value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value.toUpperCase() }))} />
          <button className={btnPrimary} disabled={saving} onClick={async () => {
            if (!form.code || !form.name || !form.currency) { setErr("代碼、名稱、幣別為必填"); return; }
            setSaving(true); setErr("");
            try { await createMarket({ ...form, description: form.description || undefined }); setForm({ code: "", name: "", currency: "", description: "" }); load(); }
            catch (e) { setErr(extractErr(e)); } finally { setSaving(false); }
          }} type="button">新增</button>
        </div>
        <input className={`${inputCls} mt-2`} placeholder="描述（選填）" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        {err ? <p className="mt-2 text-sm text-red-500">{err}</p> : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-slate-50"><tr><Th>順序</Th><Th>顯示於儀表板</Th><Th>代碼</Th><Th>名稱</Th><Th>幣別</Th><Th>目前使用模型</Th><Th>已產生模型</Th><Th>狀態</Th><Th>操作</Th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={9} className="py-10 text-center text-sm text-slate-400">載入中…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={9} className="py-10 text-center text-sm text-slate-400">尚無市場設定</td></tr>
              : rows.map((row, idx) => {
                const mktModels = allModels.filter(m => m.scope_type === "market");
                const curModel = allModels.find(m => m.id === row.current_model_id);
                const modelCount = allModels.filter(m => m.market_code === row.code).length;
                return (
              <Fragment key={row.id}>
                <tr className={["hover:bg-slate-50/60", row.is_tracked ? "bg-indigo-50/30" : ""].join(" ")}>
                  <Td>
                    <div className="flex items-center gap-1">
                      <span className="w-5 text-xs text-slate-400 tabular-nums text-center">{idx + 1}</span>
                      <div className="flex flex-col gap-0.5">
                        <button type="button" disabled={idx === 0 || saving} onClick={async () => { setSaving(true); try { const r = await reorderMarket(row.id, "up"); setRows(r); onReload(r); } finally { setSaving(false); } }} className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30">▲</button>
                        <button type="button" disabled={idx === rows.length - 1 || saving} onClick={async () => { setSaving(true); try { const r = await reorderMarket(row.id, "down"); setRows(r); onReload(r); } finally { setSaving(false); } }} className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30">▼</button>
                      </div>
                    </div>
                  </Td>
                  <Td><input type="checkbox" checked={row.is_tracked} onChange={async () => { await updateMarket(row.id, { is_tracked: !row.is_tracked }); load(); }} className="h-4 w-4 rounded accent-indigo-500 cursor-pointer" /></Td>
                  {editRow?.id === row.id ? (
                    <>
                      <Td><span className="font-mono font-semibold">{row.code}</span></Td>
                      <Td><input className={inputCls} defaultValue={row.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></Td>
                      <Td><input className={`${inputCls} w-20`} defaultValue={row.currency} onChange={e => setEditForm(p => ({ ...p, currency: e.target.value.toUpperCase() }))} /></Td>
                      <td colSpan={2} className="border-b border-slate-50 px-4 py-3 text-sm text-slate-400">請至模組設定調整</td>
                      <Td><label className="flex items-center gap-1.5 cursor-pointer text-sm"><input type="checkbox" defaultChecked={row.is_active} onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked }))} />啟用</label></Td>
                      <Td><div className="flex gap-1.5"><button className={btnPrimary} disabled={saving} onClick={async () => { setSaving(true); try { await updateMarket(editRow!.id, editForm); setEditRow(null); load(); } finally { setSaving(false); } }} type="button">儲存</button><button className={btnSecondary} onClick={() => setEditRow(null)} type="button">取消</button></div></Td>
                    </>
                  ) : (
                    <>
                      <Td><span className="font-mono font-semibold text-slate-900">{row.code}</span></Td>
                      <Td>{row.name}{row.description ? <span className="ml-2 text-xs text-slate-400">{row.description}</span> : null}</Td>
                      <Td>{row.currency}</Td>
                      <Td>{curModel ? <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-xs font-medium text-violet-700">{curModel.name} {curModel.version}</span> : <span className="text-xs text-slate-400">未設定</span>}</Td>
                      <Td>{modelCount > 0 ? <span className="inline-flex items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">{modelCount}</span> : <span className="text-xs text-slate-400">0</span>}</Td>
                      <Td><Badge label={row.is_active ? "啟用" : "停用"} color={row.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"} /></Td>
                      <Td><div className="flex gap-1.5">
                        <button className="rounded-md border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50" onClick={() => setModuleConfigMarket(row)} type="button">模組設定</button>
                        <button className={["rounded-md border px-2 py-1 text-xs font-medium transition-colors", row.crawler_enabled ? "border-sky-300 bg-sky-50 text-sky-600 hover:bg-sky-100" : "border-slate-200 text-slate-600 hover:bg-slate-50"].join(" ")} onClick={() => setCrawlerMarket(row)} type="button">{row.crawler_enabled ? "爬蟲 ●" : "爬蟲"}</button>
                        <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => { setEditRow(row); setEditForm({}); }} type="button">編輯</button>
                        <button className={btnDanger} onClick={async () => { if (!confirm(`刪除市場「${row.code}」？`)) return; try { await deleteMarket(row.id); load(); } catch (e) { alert(extractErr(e)); } }} type="button">刪除</button>
                      </div></Td>
                    </>
                  )}
                </tr>
              </Fragment>
            ); })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">✓ 點選 ▲▼ 調整市場顯示順序。勾選「顯示於儀表板」後，該市場卡片將出現在儀表板頂部。</p>

      {moduleConfigMarket && (
        <MarketModuleConfigModal
          market={moduleConfigMarket}
          allIndicators={indicators}
          allModels={allModels}
          onClose={() => setModuleConfigMarket(null)}
          onSaved={(updated) => { setRows(prev => prev.map(r => r.id === updated.id ? updated : r)); onReload(rows.map(r => r.id === updated.id ? updated : r)); setModuleConfigMarket(updated); }}
        />
      )}
      {crawlerMarket && (
        <ScopeCrawlerModal
          scopeType="market"
          scopeId={crawlerMarket.id}
          scopeName={crawlerMarket.name}
          initialEnabled={crawlerMarket.crawler_enabled ?? false}
          initialStartTime={crawlerMarket.crawler_start_time ?? null}
          initialStopTime={crawlerMarket.crawler_stop_time ?? null}
          initialYears={crawlerMarket.crawler_years ?? 10}
          allIndicators={indicators}
          apiConfigs={apiConfigs}
          onClose={() => setCrawlerMarket(null)}
          onStateChange={(patch) => {
            const updated = { ...crawlerMarket, ...patch } as MarketConfig;
            setCrawlerMarket(updated);
            setRows(prev => prev.map(r => r.id === crawlerMarket.id ? { ...r, ...patch } : r));
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Industries
// ─────────────────────────────────────────────────────────────────────────────

function MarketIndicatorPanel({ marketId, allIndicators }: { marketId: number; allIndicators: MarketIndicatorConfig[] }) {
  const [linked, setLinked] = useState<AssetIndicatorLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { getMarketIndicators(marketId).then(r => { setLinked(r); setLoading(false); }).catch(() => setLoading(false)); }, [marketId]);
  const linkedIds = useMemo(() => new Set(linked.map(l => l.indicator_config_id)), [linked]);
  async function toggle(ind: MarketIndicatorConfig) {
    setSaving(true);
    const newIds = linkedIds.has(ind.id) ? [...linkedIds].filter(id => id !== ind.id) : [...linkedIds, ind.id];
    try { const res = await setMarketIndicators(marketId, newIds); setLinked(res); } finally { setSaving(false); }
  }
  if (loading) return <p className="text-xs text-slate-400 p-4">載入中…</p>;
  return (
    <div className="p-4 bg-blue-50/40 border-b border-slate-100">
      <p className="mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">儀表板顯示指標（複選，有選取才會顯示）</p>
      <p className="mb-2 text-xs text-slate-400">只有勾選的指標才會顯示在 Dashboard 對應市場卡片中</p>
      <div className="flex flex-wrap gap-2">
        {allIndicators.filter(i => i.is_active).map(ind => (
          <button key={ind.id} type="button" disabled={saving} onClick={() => toggle(ind)}
            className={["inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              linkedIds.has(ind.id) ? "border-blue-300 bg-blue-100 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/50"
            ].join(" ")}>
            {linkedIds.has(ind.id) ? "✓ " : ""}{ind.display_name}
            <span className="text-slate-400 ml-0.5">({ind.unit})</span>
          </button>
        ))}
        {allIndicators.filter(i => i.is_active).length === 0 && <p className="text-xs text-slate-400">請先至「指標管理」新增並啟用指標</p>}
      </div>
      {linked.length > 0 && <p className="mt-2 text-xs text-slate-400">已關聯 {linked.length} 個指標：{linked.map(l => l.display_name).join("、")}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL: Market Module Config
// ─────────────────────────────────────────────────────────────────────────────

type ModuleTab = "display" | "formula" | "validation" | "select_model" | "score_rules";
const MODULE_TABS: { key: ModuleTab; label: string }[] = [
  { key: "display", label: "指標顯示" },
  { key: "formula", label: "自訂公式" },
  { key: "validation", label: "驗證設定" },
  { key: "select_model", label: "選用模型" },
  { key: "score_rules", label: "評分管理" },
];

function MultiSelectChips({
  items, selectedIds, onToggle, disabled,
}: { items: { id: number; label: string }[]; selectedIds: number[]; onToggle: (id: number) => void; disabled?: boolean }) {
  const sel = new Set(selectedIds);
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(it => (
        <button key={it.id} type="button" disabled={disabled} onClick={() => onToggle(it.id)}
          className={["inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            sel.has(it.id) ? "border-indigo-300 bg-indigo-100 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50"
          ].join(" ")}>
          {sel.has(it.id) ? "✓ " : ""}{it.label}
        </button>
      ))}
      {items.length === 0 && <p className="text-xs text-slate-400">無可用選項</p>}
    </div>
  );
}

function SearchableMultiSelect({ items, selectedIds, onToggle, placeholder }: {
  items: { id: number; label: string }[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = search ? items.filter(i => i.label.toLowerCase().includes(search.toLowerCase())) : items;
  const selected = items.filter(i => selectedIds.includes(i.id));
  return (
    <div className="relative" ref={ref}>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selected.map(i => (
            <span key={i.id} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs text-indigo-700">
              {i.label}
              <button type="button" onClick={() => onToggle(i.id)} className="ml-0.5 hover:text-red-500 leading-none">✕</button>
            </span>
          ))}
        </div>
      )}
      <input
        className={`${inputCls} w-full`}
        placeholder={placeholder ?? "搜尋並選擇…"}
        value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0
            ? <div className="px-3 py-2 text-xs text-slate-400">無符合項目</div>
            : filtered.map(i => (
              <button key={i.id} type="button"
                onClick={() => { onToggle(i.id); setSearch(""); }}
                className={["flex w-full items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors", selectedIds.includes(i.id) ? "bg-indigo-50/60" : ""].join(" ")}>
                <span className={["flex h-3.5 w-3.5 items-center justify-center rounded border text-[10px] font-bold shrink-0", selectedIds.includes(i.id) ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300"].join(" ")}>
                  {selectedIds.includes(i.id) && "✓"}
                </span>
                {i.label}
              </button>
            ))
          }
        </div>
      )}
    </div>
  );
}

type FormulaEntry = { id: number | null; field_key: string; display_name: string; weight: string; is_reverse: boolean; is_active: boolean; display_order: number };

// ─────────────────────────────────────────────────────────────────────────────
// Shared: Validation Condition Editor (structured grid)
// ─────────────────────────────────────────────────────────────────────────────

type ValCondRow = { id: string; indicatorId: string; operator: string; value: string; pct: string };

function parseValConds(raw: string): ValCondRow[] {
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}

function serializeValConds(rows: ValCondRow[]): string {
  return rows.length ? JSON.stringify(rows) : "";
}

function ValidationConditionEditor({ value, onChange, scoreIndicators }: {
  value: string;
  onChange: (v: string) => void;
  scoreIndicators: MarketIndicatorConfig[];
}) {
  const [rows, setRows] = useState<ValCondRow[]>(() => parseValConds(value));

  function update(next: ValCondRow[]) { setRows(next); onChange(serializeValConds(next)); }
  function addRow() { update([...rows, { id: String(Date.now()), indicatorId: "", operator: ">=", value: "", pct: "" }]); }
  function removeRow(id: string) { update(rows.filter(r => r.id !== id)); }
  function patchRow(id: string, patch: Partial<ValCondRow>) { update(rows.map(r => r.id === id ? { ...r, ...patch } : r)); }

  const OPS = [">=", "<=", ">", "<", "="];
  return (
    <div className="flex flex-col gap-2">
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold">
              <tr>
                <th className="px-3 py-2 text-left whitespace-nowrap">分數指標</th>
                <th className="px-3 py-2 text-left w-24">條件</th>
                <th className="px-3 py-2 text-left w-28">標的值</th>
                <th className="px-3 py-2 text-left w-28">％數</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-t border-slate-50 hover:bg-slate-50/40">
                  <td className="px-2 py-1.5">
                    <select className={inputCls + " text-xs min-w-[160px]"} value={row.indicatorId} onChange={e => patchRow(row.id, { indicatorId: e.target.value })}>
                      <option value="">— 選擇指標 —</option>
                      {scoreIndicators.map(i => <option key={i.id} value={String(i.id)}>{i.display_name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select className={inputCls + " text-xs w-20"} value={row.operator} onChange={e => patchRow(row.id, { operator: e.target.value })}>
                      {OPS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" className={inputCls + " text-xs w-24"} value={row.value} placeholder="如 70" onChange={e => patchRow(row.id, { value: e.target.value })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <input type="number" className={inputCls + " text-xs w-20"} value={row.pct} placeholder="如 80" onChange={e => patchRow(row.id, { pct: e.target.value })} />
                      <span className="text-slate-400">%</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <button type="button" className="text-slate-300 hover:text-red-500" onClick={() => removeRow(row.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button type="button" onClick={addRow}
        className="self-start rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
        + 新增條件列
      </button>
      {rows.length === 0 && <p className="text-xs text-slate-400">尚無驗證條件，點上方新增</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: Formula Module Bar (可選模組 / 另存新模組)
// ─────────────────────────────────────────────────────────────────────────────

function FormulaModuleBar({ models, onLoadModel, saveOpen, onToggleSave, saveNewName, onSaveNameChange }: {
  models: AnalysisModel[];
  onLoadModel: (entries: FormulaEntry[], expr: string) => void;
  saveOpen: boolean;
  onToggleSave: () => void;
  saveNewName: string;
  onSaveNameChange: (name: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" className={btnSecondary + " py-1.5 text-xs"}
          onClick={() => { setPickerOpen(v => !v); if (saveOpen) onToggleSave(); }}>
          可選模組 {pickerOpen ? "▲" : "▼"}
        </button>
        <button type="button" className={btnSecondary + " py-1.5 text-xs"}
          onClick={() => { onToggleSave(); setPickerOpen(false); }}>
          另存新模組 {saveOpen ? "▲" : "▼"}
        </button>
      </div>
      {saveOpen && (
        <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50/40 px-3 py-2">
          <span className="text-xs font-medium text-slate-600 whitespace-nowrap">另存新模組名稱：</span>
          <input className={inputCls + " flex-1 text-xs py-1.5"} placeholder="如：台股市場模型" value={saveNewName} onChange={e => onSaveNameChange(e.target.value)} autoFocus />
        </div>
      )}
      {pickerOpen && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-600">選擇要載入的模組</p>
          {models.length === 0 ? <p className="text-xs text-slate-400">尚無可選模組</p>
            : <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {models.map(m => (
                  <button key={m.id} type="button" onClick={() => {
                    const fSnap = m.formula_snapshot as Record<string, unknown> | null | undefined;
                    const entries = (fSnap?.formula_entries as FormulaEntry[] | undefined) ?? [];
                    const expr = String(fSnap?.formula_expr ?? "");
                    onLoadModel(entries, expr);
                    setPickerOpen(false);
                  }} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-left hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors">
                    <span className="font-medium text-sm text-slate-800">{m.name}</span>
                    <span className="font-mono text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{m.version}</span>
                    <span className={["ml-auto inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", m.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : m.status === "testing" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200"].join(" ")}>{m.status === "active" ? "啟用" : m.status === "testing" ? "測試中" : "停用"}</span>
                  </button>
                ))}
              </div>}
          <button type="button" className="self-start text-xs text-slate-400 hover:text-slate-600" onClick={() => setPickerOpen(false)}>收起</button>
        </div>
      )}
    </div>
  );
}

function MarketModuleConfigModal({
  market, allIndicators, allModels, onClose, onSaved,
}: {
  market: MarketConfig;
  allIndicators: MarketIndicatorConfig[];
  allModels: AnalysisModel[];
  onClose: () => void;
  onSaved: (updated: MarketConfig) => void;
}) {
  const [activeTab, setActiveTab] = useState<ModuleTab>("display");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [saveNewOpen, setSaveNewOpen] = useState(false);
  const [saveNewName, setSaveNewName] = useState("");
  const [saveNewing, setSaveNewing] = useState(false);

  // Display indicators
  const [linked, setLinked] = useState<AssetIndicatorLink[]>([]);
  const [linkedLoading, setLinkedLoading] = useState(true);
  const [linkedSaving, setLinkedSaving] = useState(false);

  // Module config state
  const [valAssetIds, setValAssetIds] = useState<number[]>(market.module_validation_asset_ids ?? []);
  const [valIndicatorIds, setValIndicatorIds] = useState<number[]>(market.module_validation_indicator_ids ?? []);
  const [valPeriod, setValPeriod] = useState<string>(String(market.module_validation_period_days ?? 30));
  const [valConditions, setValConditions] = useState<string>(market.module_validation_conditions ?? "");
  const [resultIds, setResultIds] = useState<number[]>(market.module_result_indicator_ids ?? []);
  const [currentModelId, setCurrentModelId] = useState<number | null>(market.current_model_id);

  // Formula builder
  const [formulaEntries, setFormulaEntries] = useState<FormulaEntry[]>([]);
  const [formulaLoading, setFormulaLoading] = useState(true);
  const [addFormulaIndId, setAddFormulaIndId] = useState<string>("");
  const [addFormulaSearch, setAddFormulaSearch] = useState<string>("");
  const [addFormulaWeight, setAddFormulaWeight] = useState<string>("10");
  const [addFormulaReverse, setAddFormulaReverse] = useState(false);
  const [previewEditId, setPreviewEditId] = useState<string | null>(null);
  const [exprWarning, setExprWarning] = useState<string>("");

  // Custom formula expression (overrides weighted sum when set)
  const [formulaExpr, setFormulaExpr] = useState<string>(market.module_formula_expr ?? "");

  // Assets for validation
  const [assets, setAssets] = useState<AssetRow[]>([]);

  useEffect(() => {
    getMarketIndicators(market.id).then(r => { setLinked(r); setLinkedLoading(false); }).catch(() => setLinkedLoading(false));
    listAdminAssets({ market: market.code, skip: 0, limit: 200 }).then(r => setAssets(r.items ?? [])).catch(() => {});
    listScoreFormulas("market_score", market.code).then(r => {
      setFormulaEntries(r.map(f => ({ id: f.id, field_key: f.field_key, display_name: f.display_name, weight: String(f.weight), is_reverse: f.is_reverse ?? false, is_active: f.is_active, display_order: f.display_order })));
      setFormulaLoading(false);
    }).catch(() => setFormulaLoading(false));
  }, [market.id, market.code]);

  const linkedIds = useMemo(() => new Set(linked.map(l => l.indicator_config_id)), [linked]);

  async function toggleDisplay(ind: MarketIndicatorConfig) {
    setLinkedSaving(true);
    const newIds = linkedIds.has(ind.id) ? [...linkedIds].filter(id => id !== ind.id) : [...linkedIds, ind.id];
    try { const res = await setMarketIndicators(market.id, newIds); setLinked(res); } finally { setLinkedSaving(false); }
  }

  async function saveModuleConfig() {
    setSaving(true); setErr(""); setSuccessMsg("");
    try {
      const updated = await updateMarket(market.id, {
        current_model_id: currentModelId,
        module_validation_asset_ids: valAssetIds,
        module_validation_indicator_ids: valIndicatorIds,
        module_validation_period_days: Number(valPeriod) || 30,
        module_result_indicator_ids: resultIds,
        module_formula_expr: formulaExpr.trim() || null,
        module_validation_conditions: valConditions.trim() || null,
      });
      onSaved(updated);
      setSuccessMsg("已儲存");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) { setErr(extractErr(e)); } finally { setSaving(false); }
  }

  async function saveAsNewModel(name: string) {
    const existingVersions = allModels.filter(m => m.source_id === market.id && m.scope_type === "market");
    const version = `V${existingVersions.length + 1}`;
    await createAnalysisModel({
      name, version, scope_type: "market", market_code: market.code, source_id: market.id, status: "testing",
      formula_snapshot: { formula_entries: formulaEntries, formula_expr: formulaExpr.trim() || null, result_indicator_ids: resultIds },
      validation_snapshot: { validation_asset_ids: valAssetIds, validation_indicator_ids: valIndicatorIds, validation_period_days: Number(valPeriod) || 30, validation_conditions: valConditions.trim() || null },
    });
    setSuccessMsg(`已另存為「${name} ${version}」`);
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  async function addFormulaEntry() {
    if (!addFormulaIndId) return;
    const ind = allIndicators.find(i => String(i.id) === addFormulaIndId);
    if (!ind) return;
    setErr("");
    try {
      const created = await createScoreFormula({
        formula_type: "market_score",
        field_key: ind.field_key,
        display_name: ind.display_name,
        weight: parseFloat(addFormulaWeight) || 1,
        is_active: true,
        use_in_calc: true,
        is_reverse: addFormulaReverse,
        display_order: formulaEntries.length + 1,
        market_code: market.code,
      });
      setFormulaEntries(prev => [...prev, { id: created.id, field_key: created.field_key, display_name: created.display_name, weight: String(created.weight), is_reverse: created.is_reverse ?? false, is_active: created.is_active, display_order: created.display_order }]);
      setAddFormulaIndId(""); setAddFormulaWeight("1"); setAddFormulaReverse(false);
    } catch (e) { setErr(extractErr(e)); }
  }

  async function removeFormulaEntry(entry: FormulaEntry) {
    if (!entry.id) return;
    try {
      await deleteScoreFormula(entry.id);
      setFormulaEntries(prev => prev.filter(e => e.id !== entry.id));
      if (formulaExpr && formulaExpr.includes(entry.field_key)) {
        setExprWarning(`⚠ 注意：已移除「${entry.display_name}」，但自訂運算式中仍含有欄位代號 ${entry.field_key}，請手動更新。`);
      }
    } catch (e) { setErr(extractErr(e)); }
  }

  async function updateFormulaEntry(entry: FormulaEntry, changes: Partial<FormulaEntry>) {
    if (!entry.id) return;
    const updated = { ...entry, ...changes };
    setFormulaEntries(prev => prev.map(e => e.id === entry.id ? updated : e));
    try { await updateScoreFormula(entry.id, { weight: parseFloat(updated.weight) || 0, is_reverse: updated.is_reverse, is_active: updated.is_active }); } catch { /* revert on error */ }
  }

  const mktModels = allModels.filter(m => m.scope_type === "market" && m.market_code === market.code);
  const activeIndicators = allIndicators.filter(i => i.is_active);
  const assetItems = assets.map(a => ({ id: a.id, label: `${a.symbol} ${a.name}` }));
  const usedFieldKeys = new Set(formulaEntries.map(e => e.field_key));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <h3 className="text-base font-semibold text-slate-900">模組設定 — {market.name} ({market.code})</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100">✕</button>
        </div>
        <div className="flex gap-1 px-6 pt-4 border-b border-slate-100 shrink-0 flex-wrap">
          {MODULE_TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
              className={["rounded-t-lg px-3 py-2 text-xs font-medium transition-colors", activeTab === t.key ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"].join(" ")}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "display" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-slate-600">儀表板顯示指標（勾選後顯示於前台市場卡片）</p>
              {linkedLoading ? <p className="text-xs text-slate-400">載入中…</p> : (
                <>
                  <SearchableMultiSelect
                    items={activeIndicators.map(i => ({ id: i.id, label: `${i.display_name} (${i.unit})` }))}
                    selectedIds={[...linkedIds]}
                    onToggle={id => { const ind = activeIndicators.find(i => i.id === id); if (ind) toggleDisplay(ind); }}
                    placeholder="搜尋指標名稱…"
                  />
                  {activeIndicators.length === 0 && <p className="text-xs text-slate-400">請先至「市場指標」新增並啟用指標</p>}
                </>
              )}
            </div>
          )}

          {activeTab === "formula" && (
            <div className="flex flex-col gap-4">
              <FormulaModuleBar
                models={mktModels}
                onLoadModel={(entries, expr) => { setFormulaEntries(entries); setFormulaExpr(expr); }}
                saveOpen={saveNewOpen}
                onToggleSave={() => setSaveNewOpen(v => !v)}
                saveNewName={saveNewName}
                onSaveNameChange={setSaveNewName}
              />

              {/* ── Result indicators ── */}
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-slate-600">整體輸出指標</p>
                <SearchableMultiSelect
                  items={activeIndicators.map(i => ({ id: i.id, label: `${i.display_name}${i.unit ? ` (${i.unit})` : ""}` }))}
                  selectedIds={resultIds}
                  onToggle={id => setResultIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                  placeholder="搜尋輸出指標…"
                />
                {resultIds.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    {resultIds.map(id => {
                      const ind = activeIndicators.find(i => i.id === id);
                      return ind ? (
                        <div key={id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-slate-700">{ind.display_name}</span>
                            <span className="font-mono text-indigo-600">{ind.field_key}</span>
                            {ind.unit && <span className="text-slate-400">({ind.unit})</span>}
                          </div>
                          <button type="button" className="text-slate-300 hover:text-red-500" onClick={() => setResultIds(prev => prev.filter(x => x !== id))}>✕</button>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* ── Formula preview ── */}
              {(() => {
                const exprActive = formulaExpr.trim();
                const active = formulaEntries.filter(e => e.is_active);
                const totalWeight = active.reduce((s, e) => s + (parseFloat(e.weight) || 0), 0);
                const weightOk = Math.abs(totalWeight - 100) < 0.5;
                const nameMap = new Map(formulaEntries.map(e => [e.field_key, e.display_name]));
                const reverseSet = new Set(formulaEntries.filter(e => e.is_reverse).map(e => e.field_key));
                const outputScoreName = resultIds.length > 0
                  ? (activeIndicators.find(i => i.id === resultIds[0])?.field_key ?? "MarketScore")
                  : "MarketScore";

                const renderExprTokens = (expr: string): React.ReactNode[] => {
                  const keys = [...nameMap.keys()].sort((a, b) => b.length - a.length);
                  if (keys.length === 0) return [expr];
                  const pattern = new RegExp(`\\b(${keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "g");
                  const nodes: React.ReactNode[] = [];
                  let last = 0, m: RegExpExecArray | null;
                  pattern.lastIndex = 0;
                  while ((m = pattern.exec(expr)) !== null) {
                    if (m.index > last) nodes.push(expr.slice(last, m.index));
                    const key = m[1];
                    nodes.push(reverseSet.has(key)
                      ? <span key={`${key}-${m.index}`} className="inline-flex items-center gap-0.5 rounded bg-amber-100 border border-amber-300 px-1 py-px text-amber-900 font-sans not-italic">{nameMap.get(key) ?? key}<span className="rounded bg-amber-300 px-0.5 text-[10px] font-bold text-amber-900 leading-none ml-0.5">↓反向</span></span>
                      : <span key={`${key}-${m.index}`} className="text-indigo-800 font-semibold">{nameMap.get(key) ?? key}</span>
                    );
                    last = pattern.lastIndex;
                  }
                  if (last < expr.length) nodes.push(expr.slice(last));
                  return nodes;
                };

                return (
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-4 py-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">公式預覽</p>
                      {!exprActive && (
                        <p className="text-xs text-slate-500">
                          啟用 {active.length} 項 ／ 權重總和{" "}
                          <span className={weightOk ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
                            {totalWeight.toFixed(0)}{weightOk ? " ✓" : "（建議為 100）"}
                          </span>
                        </p>
                      )}
                    </div>
                    {exprActive ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="rounded bg-indigo-100/60 px-3 py-2 text-sm font-mono text-indigo-900 break-all leading-relaxed">
                          <span className="font-bold text-indigo-700">{outputScoreName}</span> = {renderExprTokens(exprActive)}
                        </div>
                        <p className="text-xs text-slate-400">欄位代號已替換為指標名稱顯示；實際儲存的運算式仍為欄位代號</p>
                      </div>
                    ) : active.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">（尚未加入任何指標）</p>
                    ) : (
                      <>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-sm font-bold text-indigo-700">{outputScoreName}</span>
                            <span className="font-mono text-sm text-slate-500">=</span>
                          </div>
                          {active.map((e, i) => {
                            const eid = String(e.id ?? e.field_key);
                            const editing = previewEditId === eid;
                            return (
                              <div key={e.id ?? e.field_key} className="flex items-center gap-1.5 ml-4">
                                {i > 0 && <span className="font-mono text-sm text-slate-400 w-3 text-center">+</span>}
                                {i === 0 && <span className="w-3" />}
                                {e.is_reverse ? (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                                    {editing ? (
                                      <input type="number" step="1" autoFocus className="w-12 rounded border border-amber-400 bg-white px-1 text-xs font-mono font-bold text-amber-800 text-center outline-none" value={e.weight} onChange={ev => updateFormulaEntry(e, { weight: ev.target.value })} onBlur={() => setPreviewEditId(null)} onKeyDown={ev => { if (ev.key === "Enter" || ev.key === "Escape") setPreviewEditId(null); }} />
                                    ) : (
                                      <span className="font-mono font-bold cursor-pointer hover:underline" title="點擊編輯權重" onClick={() => setPreviewEditId(eid)}>{parseFloat(e.weight) || 0}</span>
                                    )}
                                    <span className="text-amber-500">×</span>
                                    <span>{e.display_name}</span>
                                    <span className="ml-0.5 rounded bg-amber-200 px-1 py-px text-[10px] font-bold text-amber-900 leading-none">↓ 反向</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                                    {editing ? (
                                      <input type="number" step="1" autoFocus className="w-12 rounded border border-indigo-300 bg-white px-1 text-xs font-mono font-bold text-indigo-600 text-center outline-none" value={e.weight} onChange={ev => updateFormulaEntry(e, { weight: ev.target.value })} onBlur={() => setPreviewEditId(null)} onKeyDown={ev => { if (ev.key === "Enter" || ev.key === "Escape") setPreviewEditId(null); }} />
                                    ) : (
                                      <span className="font-mono font-bold text-indigo-600 cursor-pointer hover:underline" title="點擊編輯權重" onClick={() => setPreviewEditId(eid)}>{parseFloat(e.weight) || 0}</span>
                                    )}
                                    <span className="text-slate-400">×</span>
                                    <span>{e.display_name}</span>
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-slate-400">↓ 反向 = 指標數值越高，評分貢獻越低。點擊數字可直接編輯權重。</p>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* ── Custom expression editor ── */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">自訂運算式 <span className="font-normal text-slate-400">（選填，留空則使用加權清單）</span></p>
                  </div>
                  <button type="button" className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    onClick={() => { const terms = formulaEntries.filter(e => e.is_active).map(e => `${parseFloat(e.weight) || 0} * ${e.field_key}`); setFormulaExpr(terms.join(" + ")); }}>
                    從清單產生
                  </button>
                </div>
                {exprWarning && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
                    <span className="shrink-0">⚠</span>
                    <span>{exprWarning}</span>
                    <button type="button" className="ml-auto shrink-0 text-amber-400 hover:text-amber-600" onClick={() => setExprWarning("")}>✕</button>
                  </div>
                )}
                <textarea rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 resize-none"
                  placeholder="例：20 * nasdaq_change_percent + 10 * sp500_change_percent"
                  value={formulaExpr} onChange={e => setFormulaExpr(e.target.value)} />
                {formulaExpr.trim() && (
                  <button type="button" className="self-start text-xs text-slate-400 hover:text-red-500" onClick={() => setFormulaExpr("")}>
                    清除運算式（改回加權清單模式）
                  </button>
                )}
                {/* Field key chips — derived from model entries only */}
                {formulaEntries.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs text-slate-400">可用欄位代號（來自目前模型指標，點擊插入）：</p>
                    <div className="flex flex-wrap gap-1.5">
                      {formulaEntries.map(e => (
                        <button key={e.field_key} type="button"
                          onClick={() => setFormulaExpr(prev => prev ? `${prev} + ${e.field_key}` : e.field_key)}
                          className={["rounded border px-2 py-0.5 font-mono text-xs transition-colors",
                            e.is_active ? "border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700" : "border-slate-100 bg-slate-50 text-slate-400 opacity-60"
                          ].join(" ")}
                          title={e.is_active ? e.display_name : `${e.display_name}（停用）`}>
                          {e.field_key}
                          <span className="ml-1 font-sans text-slate-400">({e.display_name}{!e.is_active ? "，停用" : ""})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Model indicator list ── */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-slate-600">目前模型使用指標</p>
                {formulaLoading ? <p className="text-xs text-slate-400">載入中…</p> : (
                  <>
                    {formulaEntries.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="grid grid-cols-[1fr_70px_50px_50px_32px] gap-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          <span>指標 / 欄位代號</span><span className="text-center">權重</span><span className="text-center">反向</span><span className="text-center">啟用</span><span></span>
                        </div>
                        {formulaEntries.map(entry => (
                          <div key={entry.id ?? entry.field_key} className="grid grid-cols-[1fr_70px_50px_50px_32px] gap-2 items-center rounded-lg border border-slate-100 bg-slate-50 px-2 py-2">
                            <div>
                              <p className="text-sm font-medium text-slate-700">{entry.display_name}</p>
                              <p className="font-mono text-xs text-slate-400">{entry.field_key}</p>
                            </div>
                            <input type="number" step="1" className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs w-full text-center" value={entry.weight}
                              onChange={e => updateFormulaEntry(entry, { weight: e.target.value })} />
                            <label className="flex items-center justify-center" title="反向（數值越高分數越低）">
                              <input type="checkbox" checked={entry.is_reverse} onChange={e => updateFormulaEntry(entry, { is_reverse: e.target.checked })} className="h-3.5 w-3.5 accent-amber-500" />
                            </label>
                            <label className="flex items-center justify-center" title="啟用">
                              <input type="checkbox" checked={entry.is_active} onChange={e => updateFormulaEntry(entry, { is_active: e.target.checked })} className="h-3.5 w-3.5 accent-emerald-500" />
                            </label>
                            <button type="button" onClick={() => removeFormulaEntry(entry)} className="flex h-6 w-6 items-center justify-center rounded text-slate-300 hover:bg-red-50 hover:text-red-500 text-xs" title="從模型移除">✕</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">尚未加入任何指標，請從下方搜尋加入</p>
                    )}
                    {/* Search and add */}
                    <div className="rounded-lg border border-dashed border-slate-200 p-3 flex flex-col gap-2">
                      <p className="text-xs font-semibold text-slate-500">新增指標至模型</p>
                      <div className="grid grid-cols-[1fr_64px_auto_auto] gap-2 items-end">
                        <div className="relative">
                          <input type="text" placeholder="搜尋指標名稱或欄位代號…" value={addFormulaSearch}
                            onChange={e => { setAddFormulaSearch(e.target.value); setAddFormulaIndId(""); }}
                            className={`${inputCls} text-xs py-1.5 w-full`} />
                          {addFormulaSearch.trim() && (
                            <div className="absolute z-10 left-0 right-0 top-full mt-0.5 border border-slate-200 rounded-lg bg-white shadow-md max-h-48 overflow-y-auto">
                              {activeIndicators.filter(i => !usedFieldKeys.has(i.field_key) && (i.display_name.toLowerCase().includes(addFormulaSearch.toLowerCase()) || i.field_key.toLowerCase().includes(addFormulaSearch.toLowerCase()))).length === 0
                                ? <p className="px-3 py-2 text-xs text-slate-400">無符合的指標</p>
                                : activeIndicators.filter(i => !usedFieldKeys.has(i.field_key) && (i.display_name.toLowerCase().includes(addFormulaSearch.toLowerCase()) || i.field_key.toLowerCase().includes(addFormulaSearch.toLowerCase()))).map(i => (
                                  <button key={i.id} type="button"
                                    onClick={() => { setAddFormulaIndId(String(i.id)); setAddFormulaSearch(i.display_name); }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 text-slate-700 border-b border-slate-50 last:border-0">
                                    <span className="font-medium">{i.display_name}</span>
                                    <span className="ml-1 font-mono text-slate-400">({i.field_key})</span>
                                    {i.indicator_category === "score" && <span className="ml-1 text-rose-500 text-[10px]">分數</span>}
                                  </button>
                                ))
                              }
                            </div>
                          )}
                        </div>
                        <input type="number" step="1" placeholder="權重" title="權重"
                          className={`${inputCls} text-xs py-1.5 text-center`} value={addFormulaWeight}
                          onChange={e => setAddFormulaWeight(e.target.value)} />
                        <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer whitespace-nowrap h-[34px]">
                          <input type="checkbox" checked={addFormulaReverse} onChange={e => setAddFormulaReverse(e.target.checked)} className="h-3.5 w-3.5 accent-amber-500" />反向
                        </label>
                        <button type="button" className={`${btnPrimary} text-xs py-1.5 whitespace-nowrap`} onClick={addFormulaEntry} disabled={!addFormulaIndId}>加入模型</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {activeTab === "validation" && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600">驗證標的（多選）</p>
                <SearchableMultiSelect items={assetItems} selectedIds={valAssetIds} onToggle={id => setValAssetIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} placeholder="搜尋驗證標的…" />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600">驗證指標（多選）</p>
                <SearchableMultiSelect items={activeIndicators.map(i => ({ id: i.id, label: i.display_name }))} selectedIds={valIndicatorIds} onToggle={id => setValIndicatorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} placeholder="搜尋驗證指標…" />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600">驗證週期（天數）</p>
                <input className={`${inputCls} w-32`} type="number" min="1" value={valPeriod} onChange={e => setValPeriod(e.target.value)} />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600">驗證條件</p>
                <ValidationConditionEditor
                  value={valConditions}
                  onChange={setValConditions}
                  scoreIndicators={allIndicators.filter(i => i.indicator_category === "score" && i.is_active)}
                />
              </div>
            </div>
          )}
          {activeTab === "select_model" && (
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold text-slate-600">選用模型（目前使用，來源：模型管理）</p>
              <select
                className={inputCls}
                value={currentModelId ?? ""}
                onChange={e => setCurrentModelId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">— 未選用 —</option>
                {mktModels.map(m => {
                  const statusLabel = MODEL_STATUS_OPTS.find(o => o.value === m.status)?.label ?? m.status;
                  return <option key={m.id} value={m.id}>{m.name} ({m.version}) · {statusLabel}</option>;
                })}
              </select>
              {currentModelId && (() => {
                const m = mktModels.find(x => x.id === currentModelId);
                if (!m) return null;
                const statusOpt = MODEL_STATUS_OPTS.find(o => o.value === m.status) ?? MODEL_STATUS_OPTS[2];
                return (
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-4 py-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{m.name}</span>
                      <span className="font-mono text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{m.version}</span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusOpt.color}`}>{statusOpt.label}</span>
                    </div>
                    {m.description && <p className="text-xs text-slate-500">{m.description}</p>}
                  </div>
                );
              })()}
              {mktModels.length === 0 && (
                <p className="text-xs text-slate-400">尚無此市場的模型，請至「另存新模組」建立後再選用</p>
              )}
            </div>
          )}
          {activeTab === "score_rules" && <ScoreRuleManager scope="market" currentModelId={currentModelId} selectedModel={mktModels.find(m => m.id === currentModelId) ?? null} indicators={activeIndicators} />}
        </div>
        <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex flex-col gap-3">
          {saveNewOpen && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 whitespace-nowrap">另存新模組名稱：</span>
              <input className={`${inputCls} flex-1`} placeholder="如：台股市場模型" value={saveNewName} onChange={e => setSaveNewName(e.target.value)} autoFocus />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              {err ? <p className="text-sm text-red-500">{err}</p> : null}
              {successMsg ? <p className="text-sm text-emerald-600">{successMsg}</p> : null}
            </div>
            <div className="flex gap-2">
              <button type="button" className={btnSecondary} onClick={onClose}>取消</button>
              <button type="button" className={`${btnSecondary} border-violet-300 text-violet-700 hover:bg-violet-50`}
                disabled={saveNewing}
                onClick={async () => {
                  if (!saveNewOpen) { setSaveNewOpen(true); return; }
                  if (!saveNewName.trim()) { setErr("請輸入模組名稱"); return; }
                  setSaveNewing(true); setErr("");
                  try { await saveAsNewModel(saveNewName); setSaveNewOpen(false); setSaveNewName(""); } finally { setSaveNewing(false); }
                }}>
                {saveNewing ? "儲存中…" : saveNewOpen ? "確認另存" : "另存新模組"}
              </button>
              <button type="button" className={btnPrimary} disabled={saving} onClick={saveModuleConfig}>
                {saving ? "儲存中…" : "儲存設定"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IndustryIndicatorPanel({ industryId, allIndicators }: { industryId: number; allIndicators: MarketIndicatorConfig[] }) {
  const [linked, setLinked] = useState<AssetIndicatorLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { getIndustryIndicators(industryId).then(r => { setLinked(r); setLoading(false); }).catch(() => setLoading(false)); }, [industryId]);
  const linkedIds = useMemo(() => new Set(linked.map(l => l.indicator_config_id)), [linked]);
  async function toggle(ind: MarketIndicatorConfig) {
    setSaving(true);
    const newIds = linkedIds.has(ind.id) ? [...linkedIds].filter(id => id !== ind.id) : [...linkedIds, ind.id];
    try { const res = await setIndustryIndicators(industryId, newIds); setLinked(res); } finally { setSaving(false); }
  }
  if (loading) return <p className="text-xs text-slate-400 p-4">載入中…</p>;
  return (
    <div className="p-4 bg-indigo-50/40 border-b border-slate-100">
      <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">關聯指標（複選）</p>
      <div className="flex flex-wrap gap-2">
        {allIndicators.map(ind => (
          <button key={ind.id} type="button" disabled={saving} onClick={() => toggle(ind)}
            className={["inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              linkedIds.has(ind.id) ? "border-indigo-300 bg-indigo-100 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50"
            ].join(" ")}>
            {linkedIds.has(ind.id) ? "✓ " : ""}{ind.display_name}
          </button>
        ))}
        {allIndicators.length === 0 && <p className="text-xs text-slate-400">請先至「指標管理」新增指標</p>}
      </div>
      {linked.length > 0 && <p className="mt-2 text-xs text-slate-400">已關聯：{linked.map(l => l.display_name).join("、")}</p>}
    </div>
  );
}

function IndustryModuleConfigModal({
  industry, allIndicators, allModels, onClose, onSaved,
}: {
  industry: IndustryRow;
  allIndicators: MarketIndicatorConfig[];
  allModels: AnalysisModel[];
  onClose: () => void;
  onSaved: (updated: IndustryRow) => void;
}) {
  type IndTab = "display" | "formula" | "validation" | "select_model" | "score_rules";
  const TABS: { key: IndTab; label: string }[] = [
    { key: "display", label: "指標顯示" },
    { key: "formula", label: "自訂公式" },
    { key: "validation", label: "驗證設定" },
    { key: "select_model", label: "選用模型" },
    { key: "score_rules", label: "評分管理" },
  ];
  const [activeTab, setActiveTab] = useState<IndTab>("display");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [saveNewOpen, setSaveNewOpen] = useState(false);
  const [saveNewName, setSaveNewName] = useState("");
  const [saveNewing, setSaveNewing] = useState(false);

  const [linked, setLinked] = useState<AssetIndicatorLink[]>([]);
  const [linkedLoading, setLinkedLoading] = useState(true);
  const [linkedSaving, setLinkedSaving] = useState(false);

  const [formulaEntries, setFormulaEntries] = useState<FormulaEntry[]>([]);
  const [formulaLoading, setFormulaLoading] = useState(true);
  const [addFormulaIndId, setAddFormulaIndId] = useState("");
  const [addFormulaSearch, setAddFormulaSearch] = useState("");
  const [addFormulaWeight, setAddFormulaWeight] = useState("10");
  const [addFormulaReverse, setAddFormulaReverse] = useState(false);
  const [previewEditId, setPreviewEditId] = useState<string | null>(null);
  const [exprWarning, setExprWarning] = useState("");
  const [valAssetIds, setValAssetIds] = useState<number[]>(industry.module_validation_asset_ids ?? []);
  const [valIndicatorIds, setValIndicatorIds] = useState<number[]>(industry.module_validation_indicator_ids ?? []);
  const [valPeriod, setValPeriod] = useState(String(industry.module_validation_period_days ?? 30));
  const [resultIds, setResultIds] = useState<number[]>(industry.module_result_indicator_ids ?? []);
  const [formulaExpr, setFormulaExpr] = useState(industry.module_formula_expr ?? "");
  const [valConditions, setValConditions] = useState<string>(industry.module_validation_conditions ?? "");
  const [currentModelId, setCurrentModelId] = useState<number | null>(industry.current_model_id);
  const [assets, setAssets] = useState<AssetRow[]>([]);

  useEffect(() => {
    getIndustryIndicators(industry.id).then(r => { setLinked(r); setLinkedLoading(false); }).catch(() => setLinkedLoading(false));
    listAdminAssets({ market: industry.market, skip: 0, limit: 200 }).then(r => setAssets(r.items ?? [])).catch(() => {});
    listScoreFormulas("industry_score", industry.market).then(r => {
      setFormulaEntries(r.map(f => ({ id: f.id, field_key: f.field_key, display_name: f.display_name, weight: String(f.weight), is_reverse: f.is_reverse ?? false, is_active: f.is_active, display_order: f.display_order })));
      setFormulaLoading(false);
    }).catch(() => setFormulaLoading(false));
  }, [industry.id, industry.market]);

  const linkedIds = useMemo(() => new Set(linked.map(l => l.indicator_config_id)), [linked]);
  const activeIndicators = allIndicators.filter(i => i.is_active);
  const usedFieldKeys = new Set(formulaEntries.map(e => e.field_key));
  const indModels = allModels.filter(m => m.scope_type === "industry");
  const assetItems = assets.map(a => ({ id: a.id, label: `${a.symbol} ${a.name}` }));

  async function toggleDisplay(ind: MarketIndicatorConfig) {
    setLinkedSaving(true);
    const newIds = linkedIds.has(ind.id) ? [...linkedIds].filter(id => id !== ind.id) : [...linkedIds, ind.id];
    try { const res = await setIndustryIndicators(industry.id, newIds); setLinked(res); } finally { setLinkedSaving(false); }
  }

  async function saveConfig() {
    setSaving(true); setErr(""); setSuccessMsg("");
    try {
      const updated = await updateIndustry(industry.id, {
        current_model_id: currentModelId,
        module_validation_asset_ids: valAssetIds,
        module_validation_indicator_ids: valIndicatorIds,
        module_validation_period_days: Number(valPeriod) || 30,
        module_result_indicator_ids: resultIds,
        module_formula_expr: formulaExpr.trim() || null,
        module_validation_conditions: valConditions.trim() || null,
      });
      onSaved(updated);
      setSuccessMsg("已儲存");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) { setErr(extractErr(e)); } finally { setSaving(false); }
  }

  async function saveAsNewModel(name: string) {
    const existingVersions = allModels.filter(m => m.source_id === industry.id && m.scope_type === "industry");
    const version = `V${existingVersions.length + 1}`;
    await createAnalysisModel({
      name, version, scope_type: "industry", market_code: industry.market, source_id: industry.id, status: "testing",
      formula_snapshot: { formula_entries: formulaEntries, formula_expr: formulaExpr.trim() || null, result_indicator_ids: resultIds },
      validation_snapshot: { validation_asset_ids: valAssetIds, validation_indicator_ids: valIndicatorIds, validation_period_days: Number(valPeriod) || 30, validation_conditions: valConditions.trim() || null },
    });
    setSuccessMsg(`已另存為「${name} ${version}」`);
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  async function addFormulaEntry() {
    if (!addFormulaIndId) return;
    const ind = allIndicators.find(i => String(i.id) === addFormulaIndId);
    if (!ind) return;
    try {
      const created = await createScoreFormula({ formula_type: "industry_score", field_key: ind.field_key, display_name: ind.display_name, weight: parseFloat(addFormulaWeight) || 1, is_active: true, use_in_calc: true, is_reverse: addFormulaReverse, display_order: formulaEntries.length + 1, market_code: industry.market });
      setFormulaEntries(prev => [...prev, { id: created.id, field_key: created.field_key, display_name: created.display_name, weight: String(created.weight), is_reverse: created.is_reverse ?? false, is_active: created.is_active, display_order: created.display_order }]);
      setAddFormulaIndId(""); setAddFormulaSearch(""); setAddFormulaWeight("10"); setAddFormulaReverse(false);
    } catch (e) { setErr(extractErr(e)); }
  }

  async function removeFormulaEntry(entry: FormulaEntry) {
    if (!entry.id) return;
    try {
      await deleteScoreFormula(entry.id);
      setFormulaEntries(prev => prev.filter(e => e.id !== entry.id));
      if (formulaExpr && formulaExpr.includes(entry.field_key)) {
        setExprWarning(`⚠ 注意：已移除「${entry.display_name}」，但自訂運算式中仍含有欄位代號 ${entry.field_key}，請手動更新。`);
      }
    } catch (e) { setErr(extractErr(e)); }
  }

  async function updateFormulaEntry(entry: FormulaEntry, changes: Partial<FormulaEntry>) {
    if (!entry.id) return;
    const updated = { ...entry, ...changes };
    setFormulaEntries(prev => prev.map(e => e.id === entry.id ? updated : e));
    try { await updateScoreFormula(entry.id, { weight: parseFloat(updated.weight) || 0, is_reverse: updated.is_reverse, is_active: updated.is_active }); } catch { /* revert on error */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <h3 className="text-base font-semibold text-slate-900">模組設定 — {industry.industry_name} ({industry.industry_code})</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100">✕</button>
        </div>
        <div className="flex gap-1 px-6 pt-4 border-b border-slate-100 shrink-0 flex-wrap">
          {TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
              className={["rounded-t-lg px-3 py-2 text-xs font-medium transition-colors", activeTab === t.key ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"].join(" ")}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "display" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-slate-600">顯示指標（勾選後顯示於前台產業卡片）</p>
              {linkedLoading ? <p className="text-xs text-slate-400">載入中…</p> : (
                <>
                  <SearchableMultiSelect
                    items={activeIndicators.map(i => ({ id: i.id, label: `${i.display_name}${i.unit ? ` (${i.unit})` : ""}` }))}
                    selectedIds={[...linkedIds]}
                    onToggle={id => { const ind = activeIndicators.find(i => i.id === id); if (ind) toggleDisplay(ind); }}
                    placeholder="搜尋指標名稱…"
                  />
                  {activeIndicators.length === 0 && <p className="text-xs text-slate-400">請先至「市場指標」新增並啟用指標</p>}
                </>
              )}
            </div>
          )}

          {activeTab === "formula" && (
            <div className="flex flex-col gap-4">
              <FormulaModuleBar
                models={indModels}
                onLoadModel={(entries, expr) => { setFormulaEntries(entries); setFormulaExpr(expr); }}
                saveOpen={saveNewOpen}
                onToggleSave={() => setSaveNewOpen(v => !v)}
                saveNewName={saveNewName}
                onSaveNameChange={setSaveNewName}
              />

              {/* ── Result indicators ── */}
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-slate-600">整體輸出指標</p>
                <SearchableMultiSelect
                  items={activeIndicators.map(i => ({ id: i.id, label: `${i.display_name}${i.unit ? ` (${i.unit})` : ""}` }))}
                  selectedIds={resultIds}
                  onToggle={id => setResultIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                  placeholder="搜尋輸出指標…"
                />
                {resultIds.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    {resultIds.map(id => {
                      const ind = activeIndicators.find(i => i.id === id);
                      return ind ? (
                        <div key={id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-slate-700">{ind.display_name}</span>
                            <span className="font-mono text-indigo-600">{ind.field_key}</span>
                            {ind.unit && <span className="text-slate-400">({ind.unit})</span>}
                          </div>
                          <button type="button" className="text-slate-300 hover:text-red-500" onClick={() => setResultIds(prev => prev.filter(x => x !== id))}>✕</button>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* ── Formula preview ── */}
              {(() => {
                const exprActive = formulaExpr.trim();
                const active = formulaEntries.filter(e => e.is_active);
                const totalWeight = active.reduce((s, e) => s + (parseFloat(e.weight) || 0), 0);
                const weightOk = Math.abs(totalWeight - 100) < 0.5;
                const nameMap = new Map(formulaEntries.map(e => [e.field_key, e.display_name]));
                const reverseSet = new Set(formulaEntries.filter(e => e.is_reverse).map(e => e.field_key));
                const outputScoreName = resultIds.length > 0
                  ? (activeIndicators.find(i => i.id === resultIds[0])?.field_key ?? "IndustryScore")
                  : "IndustryScore";
                const renderExprTokens = (expr: string): React.ReactNode[] => {
                  const keys = [...nameMap.keys()].sort((a, b) => b.length - a.length);
                  if (keys.length === 0) return [expr];
                  const pattern = new RegExp(`\\b(${keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "g");
                  const nodes: React.ReactNode[] = [];
                  let last = 0, m: RegExpExecArray | null;
                  pattern.lastIndex = 0;
                  while ((m = pattern.exec(expr)) !== null) {
                    if (m.index > last) nodes.push(expr.slice(last, m.index));
                    const key = m[1];
                    nodes.push(reverseSet.has(key)
                      ? <span key={`${key}-${m.index}`} className="inline-flex items-center gap-0.5 rounded bg-amber-100 border border-amber-300 px-1 py-px text-amber-900 font-sans not-italic">{nameMap.get(key) ?? key}<span className="rounded bg-amber-300 px-0.5 text-[10px] font-bold text-amber-900 leading-none ml-0.5">↓反向</span></span>
                      : <span key={`${key}-${m.index}`} className="text-indigo-800 font-semibold">{nameMap.get(key) ?? key}</span>
                    );
                    last = pattern.lastIndex;
                  }
                  if (last < expr.length) nodes.push(expr.slice(last));
                  return nodes;
                };
                return (
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-4 py-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">公式預覽</p>
                      {!exprActive && <p className="text-xs text-slate-500">啟用 {active.length} 項 ／ 權重總和 <span className={weightOk ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>{totalWeight.toFixed(0)}{weightOk ? " ✓" : "（建議為 100）"}</span></p>}
                    </div>
                    {exprActive ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="rounded bg-indigo-100/60 px-3 py-2 text-sm font-mono text-indigo-900 break-all leading-relaxed">
                          <span className="font-bold text-indigo-700">{outputScoreName}</span> = {renderExprTokens(exprActive)}
                        </div>
                        <p className="text-xs text-slate-400">欄位代號已替換為指標名稱顯示</p>
                      </div>
                    ) : active.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">（尚未加入任何指標）</p>
                    ) : (
                      <>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-sm font-bold text-indigo-700">{outputScoreName}</span>
                            <span className="font-mono text-sm text-slate-500">=</span>
                          </div>
                          {active.map((e, i) => {
                            const eid = String(e.id ?? e.field_key);
                            const editing = previewEditId === eid;
                            return (
                              <div key={e.id ?? e.field_key} className="flex items-center gap-1.5 ml-4">
                                {i > 0 && <span className="font-mono text-sm text-slate-400 w-3 text-center">+</span>}
                                {i === 0 && <span className="w-3" />}
                                {e.is_reverse ? (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                                    {editing ? <input type="number" step="1" autoFocus className="w-12 rounded border border-amber-400 bg-white px-1 text-xs font-mono font-bold text-amber-800 text-center outline-none" value={e.weight} onChange={ev => updateFormulaEntry(e, { weight: ev.target.value })} onBlur={() => setPreviewEditId(null)} onKeyDown={ev => { if (ev.key === "Enter" || ev.key === "Escape") setPreviewEditId(null); }} />
                                    : <span className="font-mono font-bold cursor-pointer hover:underline" title="點擊編輯權重" onClick={() => setPreviewEditId(eid)}>{parseFloat(e.weight) || 0}</span>}
                                    <span className="text-amber-500">×</span><span>{e.display_name}</span>
                                    <span className="ml-0.5 rounded bg-amber-200 px-1 py-px text-[10px] font-bold text-amber-900 leading-none">↓ 反向</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                                    {editing ? <input type="number" step="1" autoFocus className="w-12 rounded border border-indigo-300 bg-white px-1 text-xs font-mono font-bold text-indigo-600 text-center outline-none" value={e.weight} onChange={ev => updateFormulaEntry(e, { weight: ev.target.value })} onBlur={() => setPreviewEditId(null)} onKeyDown={ev => { if (ev.key === "Enter" || ev.key === "Escape") setPreviewEditId(null); }} />
                                    : <span className="font-mono font-bold text-indigo-600 cursor-pointer hover:underline" title="點擊編輯權重" onClick={() => setPreviewEditId(eid)}>{parseFloat(e.weight) || 0}</span>}
                                    <span className="text-slate-400">×</span><span>{e.display_name}</span>
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-slate-400">↓ 反向 = 指標數值越高，評分貢獻越低。點擊數字可直接編輯權重。</p>
                      </>
                    )}
                  </div>
                );
              })()}
              {/* ── Custom expression editor ── */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">自訂運算式 <span className="font-normal text-slate-400">（選填，留空則使用加權清單）</span></p>
                  <button type="button" className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    onClick={() => { const terms = formulaEntries.filter(e => e.is_active).map(e => `${parseFloat(e.weight) || 0} * ${e.field_key}`); setFormulaExpr(terms.join(" + ")); }}>
                    從清單產生
                  </button>
                </div>
                {exprWarning && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
                    <span className="shrink-0">⚠</span><span>{exprWarning}</span>
                    <button type="button" className="ml-auto shrink-0 text-amber-400 hover:text-amber-600" onClick={() => setExprWarning("")}>✕</button>
                  </div>
                )}
                <textarea rows={3} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 resize-none"
                  placeholder="例：20 * industry_pe_ratio + 30 * industry_revenue_growth"
                  value={formulaExpr} onChange={e => setFormulaExpr(e.target.value)} />
                {formulaExpr.trim() && <button type="button" className="self-start text-xs text-slate-400 hover:text-red-500" onClick={() => setFormulaExpr("")}>清除運算式</button>}
                {formulaEntries.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs text-slate-400">可用欄位代號（來自目前模型指標，點擊插入）：</p>
                    <div className="flex flex-wrap gap-1.5">
                      {formulaEntries.map(e => (
                        <button key={e.field_key} type="button"
                          onClick={() => setFormulaExpr(prev => prev ? `${prev} + ${e.field_key}` : e.field_key)}
                          className={["rounded border px-2 py-0.5 font-mono text-xs transition-colors",
                            e.is_active ? "border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700" : "border-slate-100 bg-slate-50 text-slate-400 opacity-60"
                          ].join(" ")} title={e.is_active ? e.display_name : `${e.display_name}（停用）`}>
                          {e.field_key}<span className="ml-1 font-sans text-slate-400">({e.display_name}{!e.is_active ? "，停用" : ""})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* ── Model indicator list ── */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-slate-600">目前模型使用指標</p>
                {formulaLoading ? <p className="text-xs text-slate-400">載入中…</p> : (
                  <>
                    {formulaEntries.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="grid grid-cols-[1fr_70px_50px_50px_32px] gap-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          <span>指標 / 欄位代號</span><span className="text-center">權重</span><span className="text-center">反向</span><span className="text-center">啟用</span><span></span>
                        </div>
                        {formulaEntries.map(entry => (
                          <div key={entry.id ?? entry.field_key} className="grid grid-cols-[1fr_70px_50px_50px_32px] gap-2 items-center rounded-lg border border-slate-100 bg-slate-50 px-2 py-2">
                            <div>
                              <p className="text-sm font-medium text-slate-700">{entry.display_name}</p>
                              <p className="font-mono text-xs text-slate-400">{entry.field_key}</p>
                            </div>
                            <input type="number" step="1" className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs w-full text-center" value={entry.weight} onChange={e => updateFormulaEntry(entry, { weight: e.target.value })} />
                            <label className="flex items-center justify-center" title="反向"><input type="checkbox" checked={entry.is_reverse} onChange={e => updateFormulaEntry(entry, { is_reverse: e.target.checked })} className="h-3.5 w-3.5 accent-amber-500" /></label>
                            <label className="flex items-center justify-center" title="啟用"><input type="checkbox" checked={entry.is_active} onChange={e => updateFormulaEntry(entry, { is_active: e.target.checked })} className="h-3.5 w-3.5 accent-emerald-500" /></label>
                            <button type="button" onClick={() => removeFormulaEntry(entry)} className="flex h-6 w-6 items-center justify-center rounded text-slate-300 hover:bg-red-50 hover:text-red-500 text-xs" title="從模型移除">✕</button>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-xs text-slate-400">尚未加入任何指標，請從下方搜尋加入</p>}
                    <div className="rounded-lg border border-dashed border-slate-200 p-3 flex flex-col gap-2">
                      <p className="text-xs font-semibold text-slate-500">新增指標至模型</p>
                      <div className="grid grid-cols-[1fr_64px_auto_auto] gap-2 items-end">
                        <div className="relative">
                          <input type="text" placeholder="搜尋指標名稱或欄位代號…" value={addFormulaSearch}
                            onChange={e => { setAddFormulaSearch(e.target.value); setAddFormulaIndId(""); }}
                            className={`${inputCls} text-xs py-1.5 w-full`} />
                          {addFormulaSearch.trim() && (
                            <div className="absolute z-10 left-0 right-0 top-full mt-0.5 border border-slate-200 rounded-lg bg-white shadow-md max-h-48 overflow-y-auto">
                              {activeIndicators.filter(i => !usedFieldKeys.has(i.field_key) && (i.display_name.toLowerCase().includes(addFormulaSearch.toLowerCase()) || i.field_key.toLowerCase().includes(addFormulaSearch.toLowerCase()))).length === 0
                                ? <p className="px-3 py-2 text-xs text-slate-400">無符合的指標</p>
                                : activeIndicators.filter(i => !usedFieldKeys.has(i.field_key) && (i.display_name.toLowerCase().includes(addFormulaSearch.toLowerCase()) || i.field_key.toLowerCase().includes(addFormulaSearch.toLowerCase()))).map(i => (
                                  <button key={i.id} type="button"
                                    onClick={() => { setAddFormulaIndId(String(i.id)); setAddFormulaSearch(i.display_name); }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 text-slate-700 border-b border-slate-50 last:border-0">
                                    <span className="font-medium">{i.display_name}</span>
                                    <span className="ml-1 font-mono text-slate-400">({i.field_key})</span>
                                    {i.indicator_category === "score" && <span className="ml-1 text-rose-500 text-[10px]">分數</span>}
                                  </button>
                                ))
                              }
                            </div>
                          )}
                        </div>
                        <input type="number" step="1" placeholder="權重" title="權重"
                          className={`${inputCls} text-xs py-1.5 text-center`} value={addFormulaWeight}
                          onChange={e => setAddFormulaWeight(e.target.value)} />
                        <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer whitespace-nowrap h-[34px]">
                          <input type="checkbox" checked={addFormulaReverse} onChange={e => setAddFormulaReverse(e.target.checked)} className="h-3.5 w-3.5 accent-amber-500" />反向
                        </label>
                        <button type="button" className={`${btnPrimary} text-xs py-1.5 whitespace-nowrap`} onClick={addFormulaEntry} disabled={!addFormulaIndId}>加入模型</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {activeTab === "validation" && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600">驗證標的（多選）</p>
                <SearchableMultiSelect items={assetItems} selectedIds={valAssetIds} onToggle={id => setValAssetIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} placeholder="搜尋驗證標的…" />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600">驗證指標（多選）</p>
                <SearchableMultiSelect items={activeIndicators.map(i => ({ id: i.id, label: i.display_name }))} selectedIds={valIndicatorIds} onToggle={id => setValIndicatorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} placeholder="搜尋驗證指標…" />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600">驗證週期（天數）</p>
                <input className={`${inputCls} w-32`} type="number" min="1" value={valPeriod} onChange={e => setValPeriod(e.target.value)} />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600">驗證條件</p>
                <ValidationConditionEditor
                  value={valConditions}
                  onChange={setValConditions}
                  scoreIndicators={allIndicators.filter(i => i.indicator_category === "score" && i.is_active)}
                />
              </div>
            </div>
          )}
          {activeTab === "select_model" && (
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold text-slate-600">選用模型（目前使用，來源：模型管理）</p>
              <select
                className={inputCls}
                value={currentModelId ?? ""}
                onChange={e => setCurrentModelId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">— 未選用 —</option>
                {indModels.map(m => {
                  const statusLabel = MODEL_STATUS_OPTS.find(o => o.value === m.status)?.label ?? m.status;
                  return <option key={m.id} value={m.id}>{m.name} ({m.version}) · {statusLabel}</option>;
                })}
              </select>
              {currentModelId && (() => {
                const m = indModels.find(x => x.id === currentModelId);
                if (!m) return null;
                const statusOpt = MODEL_STATUS_OPTS.find(o => o.value === m.status) ?? MODEL_STATUS_OPTS[2];
                return (
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-4 py-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{m.name}</span>
                      <span className="font-mono text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{m.version}</span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusOpt.color}`}>{statusOpt.label}</span>
                    </div>
                    {m.description && <p className="text-xs text-slate-500">{m.description}</p>}
                  </div>
                );
              })()}
              {indModels.length === 0 && (
                <p className="text-xs text-slate-400">尚無產業模型，請至「另存新模組」建立後再選用</p>
              )}
            </div>
          )}
          {activeTab === "score_rules" && <ScoreRuleManager scope="industry" currentModelId={currentModelId} selectedModel={indModels.find(m => m.id === currentModelId) ?? null} indicators={allIndicators} />}
        </div>
        <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex flex-col gap-3">
          {saveNewOpen && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 whitespace-nowrap">另存新模組名稱：</span>
              <input className={`${inputCls} flex-1`} placeholder="如：台股產業模型" value={saveNewName} onChange={e => setSaveNewName(e.target.value)} autoFocus />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              {err ? <p className="text-sm text-red-500">{err}</p> : null}
              {successMsg ? <p className="text-sm text-emerald-600">{successMsg}</p> : null}
            </div>
            <div className="flex gap-2">
              <button type="button" className={btnSecondary} onClick={onClose}>取消</button>
              <button type="button" className={`${btnSecondary} border-violet-300 text-violet-700 hover:bg-violet-50`}
                disabled={saveNewing}
                onClick={async () => {
                  if (!saveNewOpen) { setSaveNewOpen(true); return; }
                  if (!saveNewName.trim()) { setErr("請輸入模組名稱"); return; }
                  setSaveNewing(true); setErr("");
                  try { await saveAsNewModel(saveNewName); setSaveNewOpen(false); setSaveNewName(""); } finally { setSaveNewing(false); }
                }}>
                {saveNewing ? "儲存中…" : saveNewOpen ? "確認另存" : "另存新模組"}
              </button>
              <button type="button" className={btnPrimary} disabled={saving} onClick={saveConfig}>
                {saving ? "儲存中…" : "儲存設定"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IndustryFormModal({ title, initial, marketOpts, allModels, saving, err, onClose, onSave }: {
  title: string;
  initial: { industry_code: string; industry_name: string; market: string; description: string; current_model_id: string };
  marketOpts: string[];
  allModels: AnalysisModel[];
  saving: boolean;
  err: string;
  onClose: () => void;
  onSave: (f: { industry_code: string; industry_name: string; market: string; description: string; current_model_id: string }) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const indModels = allModels.filter(m => m.scope_type === "industry");
  return (
    <Modal title={title} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">代碼 *</label>
            <input className={inputCls} placeholder="如 SEMI" value={form.industry_code} onChange={e => setForm(p => ({ ...p, industry_code: e.target.value.toUpperCase() }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">名稱 *</label>
            <input className={inputCls} placeholder="如 半導體" value={form.industry_name} onChange={e => setForm(p => ({ ...p, industry_name: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">市場</label>
            <select className={inputCls} value={form.market} onChange={e => setForm(p => ({ ...p, market: e.target.value }))}>{marketOpts.map(c => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">使用模型</label>
            <select className={inputCls} value={form.current_model_id} onChange={e => setForm(p => ({ ...p, current_model_id: e.target.value }))}>
              <option value="">— 未指定 —</option>
              {indModels.map(m => <option key={m.id} value={String(m.id)}>{m.name} {m.version}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">描述</label>
          <input className={inputCls} placeholder="選填" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button className={btnSecondary} onClick={onClose} type="button">取消</button>
          <button className={btnPrimary} disabled={saving} onClick={() => onSave(form)} type="button">儲存</button>
        </div>
      </div>
    </Modal>
  );
}

function IndustriesTab({ markets, onReload }: { markets: MarketConfig[]; onReload: (rows: IndustryRow[]) => void }) {
  const [rows, setRows] = useState<IndustryRow[]>([]);
  const [tracked, setTracked] = useState<TrackedIndustry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMarket, setFilterMarket] = useState("");
  const [filterTracking, setFilterTracking] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<IndustryRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [trackingId, setTrackingId] = useState<number | null>(null);
  const [moduleConfigIndustry, setModuleConfigIndustry] = useState<IndustryRow | null>(null);
  const [crawlerIndustry, setCrawlerIndustry] = useState<IndustryRow | null>(null);
  const [allIndicators, setAllIndicators] = useState<MarketIndicatorConfig[]>([]);
  const [allModels, setAllModels] = useState<AnalysisModel[]>([]);
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);

  const trackedMap = useMemo(() => {
    const m: Record<number, number> = {};
    tracked.forEach(t => { m[t.industry_id] = t.id; });
    return m;
  }, [tracked]);

  const TRACKING_OPTS = [
    { value: "core", label: "核心追蹤", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { value: "observation", label: "觀察", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { value: "disabled", label: "停用", color: "bg-slate-100 text-slate-400 border-slate-200" },
  ];

  const loadBoth = useCallback(async () => {
    setLoading(true);
    try { const [r, tr] = await Promise.all([listAdminIndustries(), listTrackedIndustries()]); setRows(r); setTracked(tr); onReload(r); } catch { /* silently fail */ } finally { setLoading(false); }
  }, [onReload]);

  useEffect(() => {
    loadBoth();
    listIndicatorConfigs().then(r => setAllIndicators(r)).catch(() => {});
    listAnalysisModels().then(r => setAllModels(r)).catch(() => {});
    listApiConfigs().then(r => setApiConfigs(r)).catch(() => {});
  }, [loadBoth]);

  const marketOpts = markets.length > 0 ? markets.map(m => m.code) : ["TW", "US", "TWO"];

  const visibleRows = rows.filter(r => {
    if (search && !r.industry_code.toLowerCase().includes(search.toLowerCase()) && !r.industry_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterMarket && r.market !== filterMarket) return false;
    if (filterTracking && (r.tracking_status ?? "disabled") !== filterTracking) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 w-44" placeholder="搜尋代碼 / 名稱…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none" value={filterMarket} onChange={e => setFilterMarket(e.target.value)}>
            <option value="">所有市場</option>{marketOpts.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none" value={filterTracking} onChange={e => setFilterTracking(e.target.value)}>
            <option value="">所有狀態</option>
            {TRACKING_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button className={btnPrimary} onClick={() => setAddOpen(true)} type="button">+ 新增產業</button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-max w-full">
          <thead className="bg-slate-50">
            <tr>
              <Th>追蹤狀態</Th><Th>代碼</Th><Th>名稱</Th><Th>市場</Th>
              <Th>使用模型</Th><Th>已產生模型</Th><Th>描述</Th><Th>操作</Th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-400">載入中…</td></tr>
              : visibleRows.length === 0
                ? <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-400">沒有符合條件的產業</td></tr>
                : visibleRows.map(row => {
                  const status = row.tracking_status ?? "disabled";
                  const statusOpt = TRACKING_OPTS.find(o => o.value === status) ?? TRACKING_OPTS[2];
                  const curModel = allModels.find(m => m.id === row.current_model_id);
                  const modelCount = allModels.filter(m => m.source_id === row.id && m.scope_type === "industry").length;
                  return (
                    <Fragment key={row.id}>
                      <tr className={["hover:bg-slate-50/60", status === "core" ? "bg-emerald-50/20" : status === "observation" ? "bg-amber-50/20" : ""].join(" ")}>
                        <Td>
                          <select
                            value={status}
                            disabled={trackingId === row.id}
                            className={["rounded-lg border px-2 py-1 text-xs font-medium cursor-pointer outline-none transition-colors", statusOpt.color].join(" ")}
                            onChange={async (e) => {
                              setTrackingId(row.id);
                              try { await updateIndustry(row.id, { tracking_status: e.target.value }); await loadBoth(); } finally { setTrackingId(null); }
                            }}
                          >
                            {TRACKING_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </Td>
                        <Td><span className="font-mono font-semibold text-slate-900 whitespace-nowrap">{row.industry_code}</span></Td>
                        <Td>
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            {row.industry_name}
                            {trackedMap[row.id] !== undefined && <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-600">追蹤中</span>}
                          </div>
                        </Td>
                        <Td><Badge label={row.market} color="bg-blue-50 text-blue-600" /></Td>
                        <Td className="whitespace-nowrap">
                          {curModel
                            ? <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-xs font-medium text-violet-700">{curModel.name} {curModel.version}</span>
                            : <span className="text-xs text-slate-400">未指定</span>}
                          {curModel && <div className={["mt-0.5 text-[10px] font-medium", curModel.status === "active" ? "text-emerald-600" : curModel.status === "testing" ? "text-amber-600" : "text-slate-400"].join(" ")}>{curModel.status === "active" ? "啟用中" : curModel.status === "testing" ? "測試中" : "停用"}</div>}
                        </Td>
                        <Td>{modelCount > 0 ? <span className="inline-flex items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">{modelCount}</span> : <span className="text-xs text-slate-400">0</span>}</Td>
                        <Td><span className="text-slate-400 text-xs max-w-[160px] block truncate">{row.description ?? "—"}</span></Td>
                        <Td>
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <button className="rounded-md border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50" onClick={() => setModuleConfigIndustry(row)} type="button">模組設定</button>
                            <button className={["rounded-md border px-2 py-1 text-xs font-medium transition-colors", row.crawler_enabled ? "border-sky-300 bg-sky-50 text-sky-600 hover:bg-sky-100" : "border-slate-200 text-slate-600 hover:bg-slate-50"].join(" ")} onClick={() => setCrawlerIndustry(row)} type="button">{row.crawler_enabled ? "爬蟲 ●" : "爬蟲"}</button>
                            <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => setEditRow(row)} type="button">編輯</button>
                            <button className={btnDanger} onClick={async () => { if (!confirm(`刪除「${row.industry_name}」？`)) return; try { await deleteIndustry(row.id); loadBoth(); } catch (e) { alert(extractErr(e)); } }} type="button">刪除</button>
                          </div>
                        </Td>
                      </tr>
                    </Fragment>
                  );
                })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>共 {visibleRows.length} 筆{search || filterMarket || filterTracking ? `（已篩選，總計 ${rows.length} 筆）` : ""}</span>
        <p className="text-xs text-slate-400">✓ 追蹤狀態直接在列表切換；模組設定可配置指標、公式與模型</p>
      </div>

      {addOpen && (
        <IndustryFormModal
          title="新增產業"
          initial={{ industry_code: "", industry_name: "", market: marketOpts[0] ?? "TW", description: "", current_model_id: "" }}
          marketOpts={marketOpts}
          allModels={allModels}
          saving={saving}
          err={formErr}
          onClose={() => { setAddOpen(false); setFormErr(""); }}
          onSave={async f => {
            if (!f.industry_code || !f.industry_name) { setFormErr("代碼與名稱為必填"); return; }
            setSaving(true); setFormErr("");
            try { await createIndustry({ industry_code: f.industry_code, industry_name: f.industry_name, market: f.market, description: f.description || undefined }); setAddOpen(false); loadBoth(); }
            catch (e) { setFormErr(extractErr(e)); } finally { setSaving(false); }
          }}
        />
      )}
      {editRow && (
        <IndustryFormModal
          title={`編輯：${editRow.industry_name}`}
          initial={{ industry_code: editRow.industry_code, industry_name: editRow.industry_name, market: editRow.market, description: editRow.description ?? "", current_model_id: editRow.current_model_id ? String(editRow.current_model_id) : "" }}
          marketOpts={marketOpts}
          allModels={allModels}
          saving={saving}
          err={formErr}
          onClose={() => { setEditRow(null); setFormErr(""); }}
          onSave={async f => {
            setSaving(true); setFormErr("");
            try { await updateIndustry(editRow.id, { industry_name: f.industry_name, market: f.market, description: f.description || undefined, current_model_id: f.current_model_id ? Number(f.current_model_id) : null }); setEditRow(null); loadBoth(); }
            catch (e) { setFormErr(extractErr(e)); } finally { setSaving(false); }
          }}
        />
      )}
      {moduleConfigIndustry && (
        <IndustryModuleConfigModal
          industry={moduleConfigIndustry}
          allIndicators={allIndicators}
          allModels={allModels}
          onClose={() => setModuleConfigIndustry(null)}
          onSaved={(updated) => { setRows(prev => prev.map(r => r.id === updated.id ? updated : r)); setModuleConfigIndustry(updated); }}
        />
      )}
      {crawlerIndustry && (
        <ScopeCrawlerModal
          scopeType="industry"
          scopeId={crawlerIndustry.id}
          scopeName={crawlerIndustry.industry_name}
          initialEnabled={crawlerIndustry.crawler_enabled ?? false}
          initialStartTime={crawlerIndustry.crawler_start_time ?? null}
          initialStopTime={crawlerIndustry.crawler_stop_time ?? null}
          initialYears={crawlerIndustry.crawler_years ?? 10}
          allIndicators={allIndicators}
          apiConfigs={apiConfigs}
          onClose={() => setCrawlerIndustry(null)}
          onStateChange={(patch) => {
            const updated = { ...crawlerIndustry, ...patch } as IndustryRow;
            setCrawlerIndustry(updated);
            setRows(prev => prev.map(r => r.id === crawlerIndustry.id ? { ...r, ...patch } : r));
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Stocks
// ─────────────────────────────────────────────────────────────────────────────

function SymbolLookupInput({ market, onSelect }: { market: string; onSelect: (r: SymbolLookup) => void }) {
  const [sym, setSym] = useState(""); const [result, setResult] = useState<SymbolLookup | null>(null); const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleChange(v: string) {
    setSym(v); setResult(null);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) return;
    timer.current = setTimeout(async () => { setLoading(true); try { setResult(await lookupSymbol(v.trim(), market || "TW")); } finally { setLoading(false); } }, 600);
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">代碼查詢</label>
      <div className="relative"><input className={inputCls} placeholder="如 006208 或 AAPL" value={sym} onChange={e => handleChange(e.target.value)} />{loading ? <span className="absolute right-3 top-2.5 text-xs text-slate-400">查詢中…</span> : null}</div>
      {result && (
        <div className={["rounded-lg border px-4 py-3 text-sm cursor-pointer transition-colors", result.found ? "border-indigo-200 bg-indigo-50 hover:bg-indigo-100" : "border-slate-200 bg-slate-50 text-slate-400"].join(" ")} onClick={() => result.found && onSelect(result)}>
          {result.found ? <><p className="font-semibold text-slate-900">{result.symbol} <span className="text-indigo-600">{result.name ?? result.long_name}</span></p><p className="mt-1 text-xs text-slate-500">類型：{result.asset_type ?? "—"} ｜ 幣別：{result.currency ?? "—"}</p><p className="mt-1 text-xs text-indigo-500 font-medium">點擊套用 →</p></>
            : <p>找不到資訊，請手動填寫。</p>}
        </div>
      )}
    </div>
  );
}

type AssetForm = { symbol: string; name: string; market: string; asset_type: string; currency: string; industry_id: string; api_config_id: string; api_code: string; description: string; update_frequency: string; in_swing_pool: boolean; in_newsletter: boolean; needs_backtest: boolean; is_penny_stock: boolean; is_active: boolean };
function emptyAssetForm(): AssetForm { return { symbol: "", name: "", market: "TW", asset_type: "stock", currency: "TWD", industry_id: "", api_config_id: "", api_code: "", description: "", update_frequency: "", in_swing_pool: false, in_newsletter: false, needs_backtest: false, is_penny_stock: false, is_active: true }; }

function AssetModal({ title, initial, industries, markets, assetTypes, apiConfigs, onClose, onSave }: { title: string; initial: AssetForm; industries: IndustryRow[]; markets: MarketConfig[]; assetTypes: AssetTypeConfig[]; apiConfigs: ApiConfig[]; onClose: () => void; onSave: (f: AssetForm) => Promise<void> }) {
  const [form, setForm] = useState<AssetForm>(initial); const [saving, setSaving] = useState(false); const [err, setErr] = useState("");
  function set(k: keyof AssetForm, v: string | boolean) { setForm(p => ({ ...p, [k]: v })); }
  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
        <SymbolLookupInput market={form.market} onSelect={r => setForm(p => ({ ...p, symbol: r.symbol, name: r.name ?? r.long_name ?? p.name, asset_type: r.asset_type ?? p.asset_type, currency: r.currency ?? p.currency }))} />
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">代碼 *</label><input className={inputCls} value={form.symbol} onChange={e => set("symbol", e.target.value.toUpperCase())} placeholder="006208" /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">名稱 *</label><input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} placeholder="富邦台50" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">市場</label>
            <select className={inputCls} value={form.market} onChange={e => set("market", e.target.value)}>
              {markets.length > 0 ? markets.map(m => <option key={m.code} value={m.code}>{m.code} — {m.name}</option>) : ["TW", "US", "TWO"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">資產類型</label>
            <select className={inputCls} value={form.asset_type} onChange={e => set("asset_type", e.target.value)}>
              {assetTypes.filter(t => t.is_active).map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
              {assetTypes.length === 0 && <option value="stock">stock</option>}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">幣別</label><input className={inputCls} value={form.currency} onChange={e => set("currency", e.target.value.toUpperCase())} placeholder="TWD" /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">產業</label>
            <select className={inputCls} value={form.industry_id} onChange={e => set("industry_id", e.target.value)}>
              <option value="">— 不指定 —</option>{industries.map(i => <option key={i.id} value={String(i.id)}>{i.industry_name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">資料 API</label>
            <select className={inputCls} value={form.api_config_id} onChange={e => set("api_config_id", e.target.value)}>
              <option value="">— 不指定 —</option>{apiConfigs.filter(a => a.is_active).map(a => <option key={a.id} value={String(a.id)}>{a.name}（{a.code}）</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">API 代碼</label>
            <input className={inputCls} value={form.api_code} onChange={e => set("api_code", e.target.value)} placeholder="API 查詢用代碼（與代號不同時填寫）" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">更新頻率</label>
          <select className={inputCls} value={form.update_frequency} onChange={e => set("update_frequency", e.target.value)}>
            <option value="">— 不指定 —</option>
            <option value="realtime">即時</option>
            <option value="daily">每日</option>
            <option value="weekly">每週</option>
            <option value="monthly">每月</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">備注描述</label>
          <textarea className={`${inputCls} resize-y`} rows={3} value={form.description} onChange={e => set("description", e.target.value)} placeholder="選填：投資邏輯、分析備注…" />
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">標的狀態</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.in_swing_pool} onChange={e => set("in_swing_pool", e.target.checked)} className="accent-indigo-500" />加入波段推薦池</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.in_newsletter} onChange={e => set("in_newsletter", e.target.checked)} className="accent-indigo-500" />加入電子報追蹤</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.needs_backtest} onChange={e => set("needs_backtest", e.target.checked)} className="accent-indigo-500" />需要回測</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.is_penny_stock} onChange={e => set("is_penny_stock", e.target.checked)} />雞蛋水餃股</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} />啟用</label>
          </div>
        </div>
        {err ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p> : null}
        <SaveCancel onCancel={onClose} onSave={async () => { if (!form.symbol || !form.name) { setErr("代碼與名稱為必填"); return; } setSaving(true); setErr(""); try { await onSave(form); } catch (e) { setErr(extractErr(e)); } finally { setSaving(false); } }} saving={saving} />
      </div>
    </Modal>
  );
}

function AssetIndicatorPanel({ assetId, allIndicators }: { assetId: number; allIndicators: MarketIndicatorConfig[] }) {
  const [linked, setLinked] = useState<AssetIndicatorLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { getAssetIndicators(assetId).then(r => { setLinked(r); setLoading(false); }); }, [assetId]);
  const linkedIds = useMemo(() => new Set(linked.map(l => l.indicator_config_id)), [linked]);
  async function toggle(ind: MarketIndicatorConfig) {
    setSaving(true);
    const newIds = linkedIds.has(ind.id) ? [...linkedIds].filter(id => id !== ind.id) : [...linkedIds, ind.id];
    try { const res = await setAssetIndicators(assetId, newIds); setLinked(res); } finally { setSaving(false); }
  }
  if (loading) return <p className="text-xs text-slate-400 p-4">載入中…</p>;
  return (
    <div className="p-4 bg-slate-50/80 border-b border-slate-100">
      <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">關聯指標（複選）</p>
      <div className="flex flex-wrap gap-2">
        {allIndicators.map(ind => (
          <button key={ind.id} type="button" disabled={saving} onClick={() => toggle(ind)}
            className={["inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              linkedIds.has(ind.id) ? "border-indigo-300 bg-indigo-100 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50"
            ].join(" ")}>
            {linkedIds.has(ind.id) ? "✓ " : ""}{ind.display_name}
          </button>
        ))}
      </div>
      {linked.length > 0 && <p className="mt-2 text-xs text-slate-400">已關聯：{linked.map(l => l.display_name).join("、")}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset Analysis Config Modal
// ─────────────────────────────────────────────────────────────────────────────

const ANALYSIS_MODELS = [
  { key: "stock_swing", label: "股票波段模型" },
  { key: "semiconductor", label: "半導體模型" },
  { key: "ai_growth", label: "AI成長模型" },
  { key: "etf_swing", label: "ETF波段模型" },
];
const DISPLAY_OPTIONS = [
  { key: "show_technical", label: "顯示技術面" },
  { key: "show_fundamental", label: "顯示基本面" },
  { key: "show_chips", label: "顯示籌碼面" },
  { key: "show_model_score", label: "顯示模型分數" },
  { key: "show_recommendation", label: "顯示推薦原因" },
  { key: "show_risk", label: "顯示風險提醒" },
  { key: "show_backtest_summary", label: "顯示回測摘要" },
];

function CheckboxGroup({
  items, selected, onChange,
}: {
  items: { key: string; label: string }[];
  selected: string[];
  onChange: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {items.map(item => (
        <label key={item.key} className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 select-none">
          <input
            type="checkbox"
            checked={selected.includes(item.key)}
            onChange={() => onChange(item.key)}
            className="h-4 w-4 rounded accent-indigo-500"
          />
          <span className="text-sm text-slate-700">{item.label}</span>
        </label>
      ))}
    </div>
  );
}

function BoolCheckbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-4 w-4 rounded accent-indigo-500" />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function AssetAnalysisConfigModal({ asset, onClose }: { asset: AssetRow; onClose: () => void }) {
  type Tab = "technical" | "fundamental" | "chips" | "models" | "display";
  const [tab, setTab] = useState<Tab>("technical");
  const [config, setConfig] = useState<Omit<AssetAnalysisConfig, "asset_id">>({
    technical_indicators: [],
    fundamental_indicators: [],
    chips_indicators: [],
    applied_models: [],
    show_technical: true,
    show_fundamental: true,
    show_chips: false,
    show_model_score: true,
    show_recommendation: true,
    show_risk: false,
    show_backtest_summary: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dbIndicators, setDbIndicators] = useState<MarketIndicatorConfig[]>([]);

  // Data sync + delete UI
  const [syncLoading, setSyncLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [delStart, setDelStart] = useState("");
  const [delEnd, setDelEnd] = useState("");
  const [delLoading, setDelLoading] = useState(false);
  const [delResult, setDelResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getAssetAnalysisConfig(asset.id).then(c => { const { asset_id: _, ...rest } = c; setConfig(rest); }).catch(() => {}),
      listIndicatorConfigs().then(r => setDbIndicators(r)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [asset.id]);

  function toggleArr(field: "technical_indicators" | "fundamental_indicators" | "chips_indicators" | "applied_models", key: string) {
    setConfig(prev => {
      const arr = prev[field] as string[];
      return { ...prev, [field]: arr.includes(key) ? arr.filter(k => k !== key) : [...arr, key] };
    });
  }

  async function handleSave() {
    setSaving(true); setSaved(false);
    try { await saveAssetAnalysisConfig(asset.id, config); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch { /* noop */ } finally { setSaving(false); }
  }

  async function toggleSync() {
    setSyncLoading(true);
    try {
      if (asset.data_sync_enabled) {
        await pauseAssetSync(asset.id);
        asset.data_sync_enabled = false;
      } else {
        await startAssetSync(asset.id);
        asset.data_sync_enabled = true;
      }
    } catch { /* noop */ } finally { setSyncLoading(false); }
  }

  async function handleDelete() {
    setDelLoading(true); setDelResult(null);
    try {
      const r = await deleteAssetPriceData(asset.id, {
        start_date: delStart || undefined,
        end_date: delEnd || undefined,
      });
      setDelResult(`已刪除 ${r.deleted_rows} 筆資料`);
    } catch { setDelResult("刪除失敗，price_data 表可能尚未建立"); }
    setDelLoading(false);
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "technical", label: "技術面" },
    { key: "fundamental", label: "基本面" },
    { key: "chips", label: "籌碼面" },
    { key: "models", label: "模型" },
    { key: "display", label: "前台顯示" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">分析設定 — {asset.symbol} {asset.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{asset.market} · {asset.asset_type}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* Data Sync Controls */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-6 py-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">資料同步</span>
          <button type="button" disabled={syncLoading} onClick={toggleSync}
            className={["rounded-lg px-3 py-1.5 text-xs font-medium transition-colors", asset.data_sync_enabled ? "bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"].join(" ")}>
            {syncLoading ? "處理中…" : asset.data_sync_enabled ? "⏸ 暫停抓取" : "▶ 開始抓取"}
          </button>
          <button type="button" onClick={() => setDeleteOpen(v => !v)}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50">
            🗑 刪除資料
          </button>
          <span className={["ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium", asset.data_sync_enabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"].join(" ")}>
            {asset.data_sync_enabled ? "同步中" : "已暫停"}
          </span>
        </div>

        {/* Delete range form */}
        {deleteOpen && (
          <div className="border-b border-red-100 bg-red-50/40 px-6 py-3">
            <p className="mb-2 text-xs font-semibold text-red-600">選擇刪除範圍（不填則刪除全部）</p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-600">
                從 <input type="date" value={delStart} onChange={e => setDelStart(e.target.value)} className="rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none" />
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                至 <input type="date" value={delEnd} onChange={e => setDelEnd(e.target.value)} className="rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none" />
              </label>
              <button type="button" disabled={delLoading} onClick={handleDelete}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50">
                {delLoading ? "刪除中…" : "確認刪除"}
              </button>
              {delResult && <span className="text-xs text-slate-600">{delResult}</span>}
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">系統維持近10年資料滾動窗口，每次抓取新資料時自動刪除最舊一天。</p>
          </div>
        )}

        {/* Setting tabs */}
        <div className="flex gap-0.5 border-b border-slate-100 px-6 pt-4 pb-0">
          {TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={["rounded-t-lg px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2", tab === t.key ? "border-indigo-500 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-800"].join(" ")}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 px-6 py-5">
          {loading ? (
            <p className="text-sm text-slate-400">載入中…</p>
          ) : (
            <>
              {tab === "technical" && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-slate-500">勾選此標的要啟用計算與顯示的技術面指標。指標來源為「市場指標」中分類為技術面的項目。</p>
                  {dbIndicators.filter(i => i.indicator_category === "technical" && i.is_active).length === 0
                    ? <p className="text-xs text-amber-500">尚無技術面指標。請至「市場指標」管理頁新增並設定分類為「技術面」。</p>
                    : <CheckboxGroup items={dbIndicators.filter(i => i.indicator_category === "technical" && i.is_active).map(i => ({ key: i.field_key, label: i.display_name }))} selected={config.technical_indicators} onChange={k => toggleArr("technical_indicators", k)} />
                  }
                </div>
              )}
              {tab === "fundamental" && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-slate-500">勾選此標的要啟用計算的基本面指標。指標來源為「市場指標」中分類為基本面的項目。</p>
                  {dbIndicators.filter(i => i.indicator_category === "fundamental" && i.is_active).length === 0
                    ? <p className="text-xs text-amber-500">尚無基本面指標。請至「市場指標」管理頁新增並設定分類為「基本面」。</p>
                    : <CheckboxGroup items={dbIndicators.filter(i => i.indicator_category === "fundamental" && i.is_active).map(i => ({ key: i.field_key, label: i.display_name }))} selected={config.fundamental_indicators} onChange={k => toggleArr("fundamental_indicators", k)} />
                  }
                </div>
              )}
              {tab === "chips" && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-slate-500">勾選此標的要啟用的籌碼面指標。指標來源為「市場指標」中分類為籌碼面的項目。</p>
                  {dbIndicators.filter(i => i.indicator_category === "chips" && i.is_active).length === 0
                    ? <p className="text-xs text-amber-500">尚無籌碼面指標。請至「市場指標」管理頁新增並設定分類為「籌碼面」。</p>
                    : <CheckboxGroup items={dbIndicators.filter(i => i.indicator_category === "chips" && i.is_active).map(i => ({ key: i.field_key, label: i.display_name }))} selected={config.chips_indicators} onChange={k => toggleArr("chips_indicators", k)} />
                  }
                </div>
              )}
              {tab === "models" && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-slate-500">選擇此標的套用的分析模型，可多選。</p>
                  <CheckboxGroup items={ANALYSIS_MODELS} selected={config.applied_models} onChange={k => toggleArr("applied_models", k)} />
                </div>
              )}
              {tab === "display" && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-slate-500">設定哪些分析結果要顯示在前台（一般使用者視角）。</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {DISPLAY_OPTIONS.map(opt => (
                      <BoolCheckbox
                        key={opt.key}
                        checked={config[opt.key as keyof typeof config] as boolean}
                        onChange={v => setConfig(p => ({ ...p, [opt.key]: v }))}
                        label={opt.label}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <span className="text-xs text-slate-400">管理員專屬設定 · 一般使用者僅能查看前台計算結果</span>
          <div className="flex gap-2">
            {saved && <span className="text-xs text-emerald-600 self-center">✓ 已儲存</span>}
            <button type="button" onClick={onClose} className={btnSecondary}>關閉</button>
            <button type="button" onClick={handleSave} disabled={saving || loading} className={btnPrimary}>
              {saving ? "儲存中…" : "儲存設定"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset: Reusable formula editor section
// ─────────────────────────────────────────────────────────────────────────────

function FormulaEditorSection({
  entries, onEntriesChange, expr, onExprChange,
  formulaType, outputLabel, activeIndicators, market, loading, onErr,
}: {
  entries: FormulaEntry[];
  onEntriesChange: (entries: FormulaEntry[]) => void;
  expr: string;
  onExprChange: (expr: string) => void;
  formulaType: string;
  outputLabel: string;
  activeIndicators: MarketIndicatorConfig[];
  market: string;
  loading: boolean;
  onErr: (msg: string) => void;
}) {
  const [addIndId, setAddIndId] = useState("");
  const [addWeight, setAddWeight] = useState("10");
  const [addReverse, setAddReverse] = useState(false);
  const [previewEditId, setPreviewEditId] = useState<string | null>(null);
  const usedKeys = useMemo(() => new Set(entries.map(e => e.field_key)), [entries]);
  const active = useMemo(() => entries.filter(e => e.is_active), [entries]);
  const totalW = useMemo(() => active.reduce((s, e) => s + (parseFloat(e.weight) || 0), 0), [active]);
  const wOk = Math.abs(totalW - 100) < 0.5;

  async function addEntry() {
    if (!addIndId) return;
    const ind = activeIndicators.find(i => String(i.id) === addIndId);
    if (!ind) return;
    try {
      const c = await createScoreFormula({ formula_type: formulaType, field_key: ind.field_key, display_name: ind.display_name, weight: parseFloat(addWeight) || 10, is_active: true, use_in_calc: true, is_reverse: addReverse, display_order: entries.length + 1, market_code: market });
      onEntriesChange([...entries, { id: c.id, field_key: c.field_key, display_name: c.display_name, weight: String(c.weight), is_reverse: c.is_reverse ?? false, is_active: c.is_active, display_order: c.display_order }]);
      setAddIndId(""); setAddWeight("10"); setAddReverse(false); setAddSearch("");
    } catch (e) { onErr(extractErr(e)); }
  }

  async function removeEntry(entry: FormulaEntry) {
    if (!entry.id) return;
    try { await deleteScoreFormula(entry.id); onEntriesChange(entries.filter(e => e.id !== entry.id)); } catch (e) { onErr(extractErr(e)); }
  }

  async function updateEntry(entry: FormulaEntry, changes: Partial<FormulaEntry>) {
    if (!entry.id) return;
    const u = { ...entry, ...changes };
    onEntriesChange(entries.map(e => e.id === entry.id ? u : e));
    try { await updateScoreFormula(entry.id, { weight: parseFloat(u.weight) || 0, is_reverse: u.is_reverse, is_active: u.is_active }); } catch { /* silent */ }
  }

  async function removeEntryWithWarning(entry: FormulaEntry) {
    await removeEntry(entry);
    if (expr && expr.includes(entry.field_key)) {
      onErr(`⚠ 已移除「${entry.display_name}」，但自訂運算式中仍含有欄位代號 ${entry.field_key}，請手動更新。`);
    }
  }

  const [addSearch, setAddSearch] = useState("");

  return (
    <div className="flex flex-col gap-4">
      {/* Preview */}
      <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">公式預覽</p>
          {!expr.trim() && <p className="text-xs text-slate-500">啟用 {active.length} 項 ／ 權重 <span className={wOk ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>{totalW.toFixed(0)}{wOk ? " ✓" : "（建議為 100）"}</span></p>}
        </div>
        {expr.trim() ? (
          <p className="rounded bg-indigo-100/60 px-3 py-2 text-sm font-mono text-indigo-900 break-all"><span className="font-bold text-indigo-700">{outputLabel}</span> = {expr}</p>
        ) : active.length === 0 ? (
          <p className="text-sm text-slate-400 italic">（尚未加入任何指標）</p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-bold text-indigo-700">{outputLabel}</span>
                <span className="font-mono text-sm text-slate-500">=</span>
              </div>
              {active.map((e, i) => {
                const eid = String(e.id ?? e.field_key);
                const editing = previewEditId === eid;
                return (
                  <div key={e.id ?? e.field_key} className="flex items-center gap-1.5 ml-4">
                    {i > 0 && <span className="font-mono text-sm text-slate-400 w-3 text-center">+</span>}
                    {i === 0 && <span className="w-3" />}
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${e.is_reverse ? "border-amber-300 bg-amber-50 text-amber-800" : "border-indigo-200 bg-white text-slate-700"}`}>
                      {editing ? (
                        <input type="number" step="1" autoFocus className={`w-12 rounded border px-1 text-xs font-mono font-bold text-center outline-none ${e.is_reverse ? "border-amber-400 bg-white text-amber-800" : "border-indigo-300 bg-white text-indigo-600"}`} value={e.weight} onChange={ev => updateEntry(e, { weight: ev.target.value })} onBlur={() => setPreviewEditId(null)} onKeyDown={ev => { if (ev.key === "Enter" || ev.key === "Escape") setPreviewEditId(null); }} />
                      ) : (
                        <span className={`font-mono font-bold cursor-pointer hover:underline ${e.is_reverse ? "" : "text-indigo-600"}`} title="點擊編輯權重" onClick={() => setPreviewEditId(eid)}>{parseFloat(e.weight) || 0}</span>
                      )}
                      <span className="text-slate-400">×</span><span>{e.display_name}</span>
                      {e.is_reverse && <span className="ml-0.5 rounded bg-amber-200 px-1 py-px text-[10px] font-bold text-amber-900 leading-none">↓</span>}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400">↓ 反向 = 指標數值越高，評分貢獻越低。點擊數字可直接編輯權重。</p>
          </>
        )}
      </div>
      {/* Custom expr */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-700">自訂運算式 <span className="font-normal text-slate-400">（選填）</span></p>
          <button type="button" className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            onClick={() => onExprChange(entries.filter(e => e.is_active).map(e => `${parseFloat(e.weight) || 0} * ${e.field_key}`).join(" + "))}>
            從清單產生
          </button>
        </div>
        <textarea rows={2} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 resize-none"
          placeholder="例：20 * field_key + 30 * field_key2" value={expr} onChange={e => onExprChange(e.target.value)} />
        {expr.trim() && <button type="button" className="self-start text-xs text-slate-400 hover:text-red-500" onClick={() => onExprChange("")}>清除運算式</button>}
        {entries.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-slate-400">可用欄位代號（來自目前模型指標，點擊插入）：</p>
            <div className="flex flex-wrap gap-1.5">
              {entries.map(e => (
                <button key={e.field_key} type="button" onClick={() => onExprChange(expr ? `${expr} + ${e.field_key}` : e.field_key)}
                  className={["rounded border px-2 py-0.5 font-mono text-xs transition-colors",
                    e.is_active ? "border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700" : "border-slate-100 bg-slate-50 text-slate-400 opacity-60"
                  ].join(" ")} title={e.is_active ? e.display_name : `${e.display_name}（停用）`}>
                  {e.field_key}<span className="ml-1 font-sans text-slate-400">({e.display_name}{!e.is_active ? "，停用" : ""})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Model indicator list */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-slate-600">目前模型使用指標</p>
        {loading ? <p className="text-xs text-slate-400">載入中…</p> : (
          <>
            {entries.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-[1fr_70px_50px_50px_32px] gap-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <span>指標 / 欄位代號</span><span className="text-center">權重</span><span className="text-center">反向</span><span className="text-center">啟用</span><span></span>
                </div>
                {entries.map(entry => (
                  <div key={entry.id ?? entry.field_key} className="grid grid-cols-[1fr_70px_50px_50px_32px] gap-2 items-center rounded-lg border border-slate-100 bg-slate-50 px-2 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{entry.display_name}</p>
                      <p className="font-mono text-xs text-slate-400">{entry.field_key}</p>
                    </div>
                    <input type="number" step="1" className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs w-full text-center" value={entry.weight} onChange={e => updateEntry(entry, { weight: e.target.value })} />
                    <label className="flex items-center justify-center" title="反向"><input type="checkbox" checked={entry.is_reverse} onChange={e => updateEntry(entry, { is_reverse: e.target.checked })} className="h-3.5 w-3.5 accent-amber-500" /></label>
                    <label className="flex items-center justify-center" title="啟用"><input type="checkbox" checked={entry.is_active} onChange={e => updateEntry(entry, { is_active: e.target.checked })} className="h-3.5 w-3.5 accent-emerald-500" /></label>
                    <button type="button" onClick={() => removeEntryWithWarning(entry)} className="flex h-6 w-6 items-center justify-center rounded text-slate-300 hover:bg-red-50 hover:text-red-500 text-xs" title="從模型移除">✕</button>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400">尚未加入任何指標，請從下方搜尋加入</p>}
            <div className="rounded-lg border border-dashed border-slate-200 p-3 flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-500">新增指標至模型</p>
              <div className="grid grid-cols-[1fr_64px_auto_auto] gap-2 items-end">
                <div className="relative">
                  <input type="text" placeholder="搜尋指標名稱或欄位代號…" value={addSearch}
                    onChange={e => { setAddSearch(e.target.value); setAddIndId(""); }}
                    className={`${inputCls} text-xs py-1.5 w-full`} />
                  {addSearch.trim() && (
                    <div className="absolute z-10 left-0 right-0 top-full mt-0.5 border border-slate-200 rounded-lg bg-white shadow-md max-h-48 overflow-y-auto">
                      {activeIndicators.filter(i => !usedKeys.has(i.field_key) && (i.display_name.toLowerCase().includes(addSearch.toLowerCase()) || i.field_key.toLowerCase().includes(addSearch.toLowerCase()))).length === 0
                        ? <p className="px-3 py-2 text-xs text-slate-400">無符合的指標</p>
                        : activeIndicators.filter(i => !usedKeys.has(i.field_key) && (i.display_name.toLowerCase().includes(addSearch.toLowerCase()) || i.field_key.toLowerCase().includes(addSearch.toLowerCase()))).map(i => (
                          <button key={i.id} type="button"
                            onClick={() => { setAddIndId(String(i.id)); setAddSearch(i.display_name); }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 text-slate-700 border-b border-slate-50 last:border-0">
                            <span className="font-medium">{i.display_name}</span>
                            <span className="ml-1 font-mono text-slate-400">({i.field_key})</span>
                            {i.indicator_category === "score" && <span className="ml-1 text-rose-500 text-[10px]">分數</span>}
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>
                <input type="number" step="1" placeholder="權重" title="權重"
                  className={`${inputCls} text-xs py-1.5 text-center`} value={addWeight}
                  onChange={e => setAddWeight(e.target.value)} />
                <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer whitespace-nowrap h-[34px]">
                  <input type="checkbox" checked={addReverse} onChange={e => setAddReverse(e.target.checked)} className="h-3.5 w-3.5 accent-amber-500" />反向
                </label>
                <button type="button" className={`${btnPrimary} text-xs py-1.5 whitespace-nowrap`} onClick={addEntry} disabled={!addIndId}>加入模型</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset: Module Config Modal (redesigned)
// ─────────────────────────────────────────────────────────────────────────────

function AssetModuleConfigModal({
  asset, allIndicators, allModels, onClose, onSaved,
}: {
  asset: AssetRow;
  allIndicators: MarketIndicatorConfig[];
  allModels: AnalysisModel[];
  onClose: () => void;
  onSaved: (updated: AssetRow) => void;
}) {
  type AstTab = "display" | "analysis" | "swing" | "position";
  type AnalysisSubTab = "fundamental" | "technical" | "chips" | "select_model" | "export";
  type SwingSubTab = "formula" | "model" | "score_rules" | "validation" | "export";
  type PositionSubTab = "formula" | "model" | "score_rules" | "validation" | "export";

  const AST_TABS: { key: AstTab; label: string }[] = [
    { key: "display", label: "顯示指標" },
    { key: "analysis", label: "分析設定" },
    { key: "swing", label: "波段設定" },
    { key: "position", label: "檔位設定" },
  ];
  const ANALYSIS_FORMULA_SUBS: { key: AnalysisSubTab; label: string; fType: string; output: string }[] = [
    { key: "fundamental", label: "基本面公式設定", fType: "fundamental_score", output: "FundamentalScore" },
    { key: "technical",   label: "技術面公式設定", fType: "technical_score",   output: "TechnicalScore"  },
    { key: "chips",       label: "籌碼面公式設定", fType: "chips_score",       output: "ChipScore"       },
  ];
  const ANALYSIS_SUBS: { key: AnalysisSubTab; label: string }[] = [
    ...ANALYSIS_FORMULA_SUBS,
    { key: "select_model", label: "選用模組", fType: "", output: "" } as { key: AnalysisSubTab; label: string },
    { key: "export",       label: "輸出模組", fType: "", output: "" } as { key: AnalysisSubTab; label: string },
  ];
  const SWING_SUBS: { key: SwingSubTab; label: string }[] = [
    { key: "formula",     label: "波段公式設定" },
    { key: "model",       label: "目前選用模型" },
    { key: "score_rules", label: "評分管理"     },
    { key: "validation",  label: "波段驗證"     },
    { key: "export",      label: "輸出模組"     },
  ];
  const POSITION_SUBS: { key: PositionSubTab; label: string }[] = [
    { key: "formula",     label: "檔位公式設定" },
    { key: "model",       label: "目前選用模型" },
    { key: "score_rules", label: "評分管理"     },
    { key: "validation",  label: "檔位驗證"     },
    { key: "export",      label: "輸出模組"     },
  ];
  const [activeTab, setActiveTab] = useState<AstTab>("display");
  const [analysisSubTab, setAnalysisSubTab] = useState<AnalysisSubTab>("fundamental");
  const [swingSubTab, setSwingSubTab] = useState<SwingSubTab>("formula");
  const [positionSubTab, setPositionSubTab] = useState<PositionSubTab>("formula");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [analysisExportName, setAnalysisExportName] = useState(`${asset.symbol} 分析模組`);
  const [swingExportName, setSwingExportName] = useState(`${asset.symbol} 波段模組`);
  const [positionExportName, setPositionExportName] = useState(`${asset.symbol} 檔位模組`);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Display
  const [linked, setLinked] = useState<AssetIndicatorLink[]>([]);
  const [linkedLoading, setLinkedLoading] = useState(true);
  const [linkedSaving, setLinkedSaving] = useState(false);

  // Analysis formulas
  const [formulaLoading, setFormulaLoading] = useState(true);
  const [fundamentalEntries, setFundamentalEntries] = useState<FormulaEntry[]>([]);
  const [fundamentalExpr, setFundamentalExpr] = useState("");
  const [technicalEntries, setTechnicalEntries] = useState<FormulaEntry[]>([]);
  const [technicalExpr, setTechnicalExpr] = useState("");
  const [chipsEntries, setChipsEntries] = useState<FormulaEntry[]>([]);
  const [chipsExpr, setChipsExpr] = useState("");

  // Swing
  const [swingEntries, setSwingEntries] = useState<FormulaEntry[]>([]);
  const [swingExpr, setSwingExpr] = useState("");
  const [swingModelId, setSwingModelId] = useState<number | null>(asset.current_model_id);
  const [swingValPeriod, setSwingValPeriod] = useState(String(asset.module_validation_period_days ?? 30));
  const [swingValConditions, setSwingValConditions] = useState(asset.module_validation_conditions ?? "");
  const [swingValIndicatorIds, setSwingValIndicatorIds] = useState<number[]>(asset.module_validation_indicator_ids ?? []);
  const [swingValAssetIds, setSwingValAssetIds] = useState<number[]>(asset.module_validation_asset_ids ?? []);

  // Position
  const [positionEntries, setPositionEntries] = useState<FormulaEntry[]>([]);
  const [positionExpr, setPositionExpr] = useState("");
  const [positionModelId, setPositionModelId] = useState<number | null>(asset.position_model_id ?? null);
  const [positionValPeriod, setPositionValPeriod] = useState("30");
  const [positionValConditions, setPositionValConditions] = useState("");
  const [positionValIndicatorIds, setPositionValIndicatorIds] = useState<number[]>([]);
  const [positionValAssetIds, setPositionValAssetIds] = useState<number[]>([]);

  // Analysis selected model
  const [analysisModelId, setAnalysisModelId] = useState<number | null>(asset.analysis_model_id ?? null);
  // Result indicators per module
  const [analysisResultIds, setAnalysisResultIds] = useState<number[]>(asset.module_result_indicator_ids ?? []);
  const [swingResultIds, setSwingResultIds] = useState<number[]>([]);
  const [positionResultIds, setPositionResultIds] = useState<number[]>([]);

  const [peerAssets, setPeerAssets] = useState<AssetRow[]>([]);

  useEffect(() => {
    getAssetIndicators(asset.id).then(r => { setLinked(r); setLinkedLoading(false); }).catch(() => setLinkedLoading(false));
    listAdminAssets({ market: asset.market, skip: 0, limit: 200 }).then(r => setPeerAssets(r.items ?? [])).catch(() => {});
    // Parse formula expressions from JSON-encoded module_formula_expr
    try {
      const parsed = asset.module_formula_expr ? JSON.parse(asset.module_formula_expr) : {};
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        setFundamentalExpr(String(parsed.fundamental ?? ""));
        setTechnicalExpr(String(parsed.technical ?? ""));
        setChipsExpr(String(parsed.chips ?? ""));
        setSwingExpr(String(parsed.swing ?? ""));
        setPositionExpr(String(parsed.position ?? ""));
      }
    } catch { /* not JSON */ }
    const toEntry = (f: ScoreFormula): FormulaEntry => ({ id: f.id, field_key: f.field_key, display_name: f.display_name, weight: String(f.weight), is_reverse: f.is_reverse ?? false, is_active: f.is_active, display_order: f.display_order });
    Promise.all([
      listScoreFormulas("fundamental_score", asset.market),
      listScoreFormulas("technical_score", asset.market),
      listScoreFormulas("chips_score", asset.market),
      listScoreFormulas("swing_score", asset.market),
      listScoreFormulas("position_score", asset.market),
    ]).then(([fund, tech, chips, swing, pos]) => {
      setFundamentalEntries(fund.map(toEntry)); setTechnicalEntries(tech.map(toEntry));
      setChipsEntries(chips.map(toEntry)); setSwingEntries(swing.map(toEntry)); setPositionEntries(pos.map(toEntry));
      setFormulaLoading(false);
    }).catch(() => setFormulaLoading(false));
  }, [asset.id, asset.market]);

  const linkedIds = useMemo(() => new Set(linked.map(l => l.indicator_config_id)), [linked]);
  const activeIndicators = allIndicators.filter(i => i.is_active);
  const astModels = allModels.filter(m => m.scope_type === "asset");
  const peerAssetItems = peerAssets.map(a => ({ id: a.id, label: `${a.symbol} ${a.name}` }));

  async function toggleDisplay(ind: MarketIndicatorConfig) {
    setLinkedSaving(true);
    const newIds = linkedIds.has(ind.id) ? [...linkedIds].filter(id => id !== ind.id) : [...linkedIds, ind.id];
    try { const res = await setAssetIndicators(asset.id, newIds); setLinked(res); } finally { setLinkedSaving(false); }
  }

  async function saveConfig() {
    setSaving(true); setErr(""); setSuccessMsg("");
    try {
      const exprJson = JSON.stringify({
        fundamental: fundamentalExpr.trim() || null,
        technical: technicalExpr.trim() || null,
        chips: chipsExpr.trim() || null,
        swing: swingExpr.trim() || null,
        position: positionExpr.trim() || null,
      });
      const updated = await updateAdminAsset(asset.id, {
        current_model_id: swingModelId,
        position_model_id: positionModelId,
        analysis_model_id: analysisModelId,
        module_result_indicator_ids: analysisResultIds,
        module_validation_asset_ids: swingValAssetIds,
        module_validation_indicator_ids: swingValIndicatorIds,
        module_validation_period_days: Number(swingValPeriod) || 30,
        module_formula_expr: exprJson,
        module_validation_conditions: swingValConditions.trim() || null,
      });
      onSaved(updated);
      setSuccessMsg("已儲存"); setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) { setErr(extractErr(e)); } finally { setSaving(false); }
  }

  async function exportModel(name: string, modelType: string, snapshot: Record<string, unknown>) {
    if (!name.trim()) { setErr("請輸入模組名稱"); return; }
    setExporting(true); setErr(""); setSuccessMsg("");
    try {
      const existingVersions = allModels.filter(m => m.source_id === asset.id && m.scope_type === "asset");
      const version = `V${existingVersions.length + 1}`;
      await createAnalysisModel({
        name: name.trim(), version, scope_type: "asset", market_code: asset.market,
        source_id: asset.id, status: "testing",
        formula_snapshot: { model_type: modelType, ...snapshot },
      });
      setSuccessMsg(`已輸出「${name.trim()} ${version}」`); setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) { setErr(extractErr(e)); } finally { setExporting(false); }
  }

  const subTabCls = (isActive: boolean) =>
    ["rounded-md px-3 py-1.5 text-xs font-medium transition-colors", isActive ? "bg-slate-200 text-slate-800" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"].join(" ");

  const MODEL_STATUS_COLOR: Record<string, string> = { active: "bg-emerald-50 text-emerald-700 border-emerald-200", testing: "bg-amber-50 text-amber-700 border-amber-200", disabled: "bg-slate-100 text-slate-500 border-slate-200" };
  const MODEL_STATUS_LABEL: Record<string, string> = { active: "啟用", testing: "測試中", disabled: "停用" };

  function renderModelPicker(modelId: number | null, setModelId: (id: number | null) => void) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-xs font-semibold text-slate-600">選用模型（來源：模型管理）</p>
        <select
          className={inputCls}
          value={modelId ?? ""}
          onChange={e => setModelId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">— 未選用 —</option>
          {astModels.map(m => {
            const statusLabel = MODEL_STATUS_OPTS.find(o => o.value === m.status)?.label ?? m.status;
            return <option key={m.id} value={m.id}>{m.name} ({m.version}) · {statusLabel}</option>;
          })}
        </select>
        {modelId && (() => {
          const m = astModels.find(x => x.id === modelId);
          if (!m) return null;
          const statusOpt = MODEL_STATUS_OPTS.find(o => o.value === m.status) ?? MODEL_STATUS_OPTS[2];
          return (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-4 py-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">{m.name}</span>
                <span className="font-mono text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{m.version}</span>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusOpt.color}`}>{statusOpt.label}</span>
              </div>
              {m.description && <p className="text-xs text-slate-500">{m.description}</p>}
            </div>
          );
        })()}
        {astModels.length === 0 && (
          <p className="text-xs text-slate-400">尚無標的模型</p>
        )}
      </div>
    );
  }

  function renderValidation(
    valPeriod: string, setValPeriod: (v: string) => void,
    valConditions: string, setValConditions: (v: string) => void,
    valIndIds: number[], setValIndIds: (ids: number[]) => void,
    valAssetIds: number[], setValAssetIds: (ids: number[]) => void,
    placeholder: string,
  ) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-600">驗證標的（多選）</p>
          <SearchableMultiSelect items={peerAssetItems} selectedIds={valAssetIds} onToggle={id => setValAssetIds(valAssetIds.includes(id) ? valAssetIds.filter(x => x !== id) : [...valAssetIds, id])} placeholder="搜尋驗證標的…" />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-600">驗證指標（多選）</p>
          <SearchableMultiSelect items={activeIndicators.map(i => ({ id: i.id, label: i.display_name }))} selectedIds={valIndIds} onToggle={id => setValIndIds(valIndIds.includes(id) ? valIndIds.filter(x => x !== id) : [...valIndIds, id])} placeholder="搜尋驗證指標…" />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-600">驗證週期（天數）</p>
          <input className={`${inputCls} w-32`} type="number" min="1" value={valPeriod} onChange={e => setValPeriod(e.target.value)} />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-600">驗證條件</p>
          <ValidationConditionEditor
            value={valConditions}
            onChange={setValConditions}
            scoreIndicators={allIndicators.filter(i => i.indicator_category === "score" && i.is_active)}
          />
        </div>
      </div>
    );
  }

  const showSave = (activeTab === "analysis" && analysisSubTab !== "export")
    || (activeTab === "swing" && swingSubTab !== "export" && swingSubTab !== "score_rules")
    || (activeTab === "position" && positionSubTab !== "export" && positionSubTab !== "score_rules");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <h3 className="text-base font-semibold text-slate-900">模組設定 — {asset.symbol} {asset.name}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100">✕</button>
        </div>
        {/* Top-level tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b border-slate-100 shrink-0 flex-wrap">
          {AST_TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
              className={["rounded-t-lg px-3 py-2 text-xs font-medium transition-colors", activeTab === t.key ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"].join(" ")}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── 顯示指標 ── */}
          {activeTab === "display" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-slate-600">顯示指標（勾選後顯示於前台標的詳情）</p>
              {linkedLoading ? <p className="text-xs text-slate-400">載入中…</p> : (
                <>
                  <SearchableMultiSelect
                    items={activeIndicators.map(i => ({ id: i.id, label: `${i.display_name}${i.unit ? ` (${i.unit})` : ""}` }))}
                    selectedIds={[...linkedIds]}
                    onToggle={id => { const ind = activeIndicators.find(i => i.id === id); if (ind) toggleDisplay(ind); }}
                    placeholder="搜尋指標名稱…"
                  />
                  {activeIndicators.length === 0 && <p className="text-xs text-slate-400">請先至「指標管理」新增並啟用指標</p>}
                </>
              )}
              {/* dead code below — kept for compiler but never rendered */}
              {false && activeIndicators.map(ind => (
                    <button key={ind.id} type="button" disabled={linkedSaving} onClick={() => toggleDisplay(ind)}
                      className={["inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        linkedIds.has(ind.id) ? "border-blue-300 bg-blue-100 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                      ].join(" ")}>
                      {linkedIds.has(ind.id) ? "✓ " : ""}{ind.display_name}
                    </button>
                  ))}
            </div>
          )}

          {/* ── 分析設定 ── */}
          {activeTab === "analysis" && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-1 flex-wrap">
                {ANALYSIS_SUBS.map(s => (
                  <button key={s.key} type="button" onClick={() => setAnalysisSubTab(s.key)} className={subTabCls(analysisSubTab === s.key)}>{s.label}</button>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 font-medium">整體輸出指標</span>
                <SearchableMultiSelect
                  items={allIndicators.filter(i => i.is_active).map(i => ({ id: i.id, label: `${i.display_name}${i.unit ? ` (${i.unit})` : ""}` }))}
                  selectedIds={analysisResultIds}
                  onToggle={id => setAnalysisResultIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                  placeholder="搜尋輸出指標…"
                />
              </div>
              {ANALYSIS_FORMULA_SUBS.map(s => analysisSubTab === s.key && (
                <FormulaEditorSection key={s.key}
                  entries={s.key === "fundamental" ? fundamentalEntries : s.key === "technical" ? technicalEntries : chipsEntries}
                  onEntriesChange={s.key === "fundamental" ? setFundamentalEntries : s.key === "technical" ? setTechnicalEntries : setChipsEntries}
                  expr={s.key === "fundamental" ? fundamentalExpr : s.key === "technical" ? technicalExpr : chipsExpr}
                  onExprChange={s.key === "fundamental" ? setFundamentalExpr : s.key === "technical" ? setTechnicalExpr : setChipsExpr}
                  formulaType={s.fType} outputLabel={s.output}
                  activeIndicators={activeIndicators} market={asset.market} loading={formulaLoading} onErr={setErr} />
              ))}
              {analysisSubTab === "select_model" && renderModelPicker(analysisModelId, setAnalysisModelId)}
              {analysisSubTab === "export" && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs font-semibold text-slate-600">輸出分析模組</p>
                  <p className="text-xs text-slate-400">將目前的基本面 / 技術面 / 籌碼面公式設定輸出為版本記錄，版本號自動累加</p>
                  <input className={`${inputCls} max-w-sm`} placeholder="模組名稱" value={analysisExportName} onChange={e => setAnalysisExportName(e.target.value)} />
                  <button type="button" className={btnPrimary} disabled={exporting || !analysisExportName.trim()}
                    onClick={() => exportModel(analysisExportName, "analysis", { fundamental_expr: fundamentalExpr.trim() || null, technical_expr: technicalExpr.trim() || null, chips_expr: chipsExpr.trim() || null })}>
                    {exporting ? "輸出中…" : "輸出模組"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── 波段設定 ── */}
          {activeTab === "swing" && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-1 flex-wrap">
                {SWING_SUBS.map(s => (
                  <button key={s.key} type="button" onClick={() => setSwingSubTab(s.key)} className={subTabCls(swingSubTab === s.key)}>{s.label}</button>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 font-medium">輸出指標</span>
                <SearchableMultiSelect
                  items={allIndicators.filter(i => i.is_active).map(i => ({ id: i.id, label: `${i.display_name}${i.unit ? ` (${i.unit})` : ""}` }))}
                  selectedIds={swingResultIds}
                  onToggle={id => setSwingResultIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                  placeholder="搜尋輸出指標…"
                />
              </div>
              {swingSubTab === "formula" && (
                <FormulaEditorSection entries={swingEntries} onEntriesChange={setSwingEntries} expr={swingExpr} onExprChange={setSwingExpr}
                  formulaType="swing_score" outputLabel="SwingScore" activeIndicators={activeIndicators} market={asset.market} loading={formulaLoading} onErr={setErr} />
              )}
              {swingSubTab === "model" && renderModelPicker(swingModelId, setSwingModelId)}
              {swingSubTab === "score_rules" && (
                <ScoreRuleManager scope="asset" currentModelId={swingModelId} selectedModel={astModels.find(m => m.id === swingModelId) ?? null} indicators={allIndicators} />
              )}
              {swingSubTab === "validation" && renderValidation(
                swingValPeriod, setSwingValPeriod, swingValConditions, setSwingValConditions,
                swingValIndicatorIds, setSwingValIndicatorIds, swingValAssetIds, setSwingValAssetIds,
                "例：SwingScore > 70",
              )}
              {swingSubTab === "export" && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs font-semibold text-slate-600">輸出波段模組</p>
                  <p className="text-xs text-slate-400">將波段公式設定輸出為版本記錄，版本號自動累加</p>
                  <input className={`${inputCls} max-w-sm`} placeholder="模組名稱" value={swingExportName} onChange={e => setSwingExportName(e.target.value)} />
                  <button type="button" className={btnPrimary} disabled={exporting || !swingExportName.trim()}
                    onClick={() => exportModel(swingExportName, "swing", { swing_expr: swingExpr.trim() || null, swing_model_id: swingModelId })}>
                    {exporting ? "輸出中…" : "輸出模組"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── 檔位設定 ── */}
          {activeTab === "position" && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-1 flex-wrap">
                {POSITION_SUBS.map(s => (
                  <button key={s.key} type="button" onClick={() => setPositionSubTab(s.key)} className={subTabCls(positionSubTab === s.key)}>{s.label}</button>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 font-medium">輸出指標</span>
                <SearchableMultiSelect
                  items={allIndicators.filter(i => i.is_active).map(i => ({ id: i.id, label: `${i.display_name}${i.unit ? ` (${i.unit})` : ""}` }))}
                  selectedIds={positionResultIds}
                  onToggle={id => setPositionResultIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                  placeholder="搜尋輸出指標…"
                />
              </div>
              {positionSubTab === "formula" && (
                <FormulaEditorSection entries={positionEntries} onEntriesChange={setPositionEntries} expr={positionExpr} onExprChange={setPositionExpr}
                  formulaType="position_score" outputLabel="PositionScore" activeIndicators={activeIndicators} market={asset.market} loading={formulaLoading} onErr={setErr} />
              )}
              {positionSubTab === "model" && renderModelPicker(positionModelId, setPositionModelId)}
              {positionSubTab === "score_rules" && (
                <ScoreRuleManager scope="asset" currentModelId={positionModelId} selectedModel={astModels.find(m => m.id === positionModelId) ?? null} indicators={allIndicators} />
              )}
              {positionSubTab === "validation" && renderValidation(
                positionValPeriod, setPositionValPeriod, positionValConditions, setPositionValConditions,
                positionValIndicatorIds, setPositionValIndicatorIds, positionValAssetIds, setPositionValAssetIds,
                "例：PositionScore > 70",
              )}
              {positionSubTab === "export" && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs font-semibold text-slate-600">輸出檔位模組</p>
                  <p className="text-xs text-slate-400">將檔位公式設定輸出為版本記錄，版本號自動累加</p>
                  <input className={`${inputCls} max-w-sm`} placeholder="模組名稱" value={positionExportName} onChange={e => setPositionExportName(e.target.value)} />
                  <button type="button" className={btnPrimary} disabled={exporting || !positionExportName.trim()}
                    onClick={() => exportModel(positionExportName, "position", { position_expr: positionExpr.trim() || null, position_model_id: positionModelId })}>
                    {exporting ? "輸出中…" : "輸出模組"}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
        <div className="shrink-0 flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <div>
            {err ? <p className="text-sm text-red-500">{err}</p> : null}
            {successMsg ? <p className="text-sm text-emerald-600">{successMsg}</p> : null}
          </div>
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={onClose}>關閉</button>
            {showSave && (
              <button type="button" className={btnPrimary} disabled={saving} onClick={saveConfig}>
                {saving ? "儲存中…" : "儲存設定"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Generic Scope Crawler Modal (market / industry)
// ─────────────────────────────────────────────────────────────────────────────

function ScopeCrawlerModal({ scopeType, scopeId, scopeName, initialEnabled, initialStartTime, initialStopTime, initialYears, allIndicators, apiConfigs, onClose, onStateChange }: {
  scopeType: ScopeType;
  scopeId: number;
  scopeName: string;
  initialEnabled: boolean;
  initialStartTime: string | null;
  initialStopTime: string | null;
  initialYears: number;
  allIndicators: MarketIndicatorConfig[];
  apiConfigs: ApiConfig[];
  onClose: () => void;
  onStateChange: (patch: { crawler_enabled?: boolean; crawler_start_time?: string | null; crawler_stop_time?: string | null; crawler_years?: number }) => void;
}) {
  type SCTab = "settings" | "indicators";
  const [tab, setTab] = useState<SCTab>("settings");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [startTime, setStartTime] = useState<string | null>(initialStartTime);
  const [stopTime, setStopTime] = useState<string | null>(initialStopTime);
  const [years, setYears] = useState(initialYears ?? 10);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // indicators tab
  const [crawlerInds, setCrawlerInds] = useState<AssetCrawlerIndicatorRow[]>([]);
  const [indLoading, setIndLoading] = useState(false);
  const [expandedIndId, setExpandedIndId] = useState<number | null>(null);
  const [indL1Filter, setIndL1Filter] = useState("");
  const [indTypeFilter, setIndTypeFilter] = useState("");
  const [addIndOpen, setAddIndOpen] = useState(false);
  const [addIndSelected, setAddIndSelected] = useState<number[]>([]);
  const [addIndFreq, setAddIndFreq] = useState("daily");
  const [addIndTime, setAddIndTime] = useState("09:00");
  const [addIndApiId, setAddIndApiId] = useState<string>("");
  const [indEditMap, setIndEditMap] = useState<Record<number, Partial<AssetCrawlerIndicatorRow>>>({});

  function flash(msg: string) { setOk(msg); setTimeout(() => setOk(""), 3000); }

  const loadInds = useCallback(async () => {
    setIndLoading(true);
    try { setCrawlerInds(await listScopeCrawlerIndicators(scopeType, scopeId)); } catch { /* ignore */ } finally { setIndLoading(false); }
  }, [scopeType, scopeId]);

  useEffect(() => { if (tab === "indicators") loadInds(); }, [tab, loadInds]);

  async function handleStart() {
    if (!confirm(`開始爬取「${scopeName}」的指標資料？`)) return;
    setBusy(true); setErr("");
    try {
      const r = await startScopeCrawler(scopeType, scopeId);
      setEnabled(r.crawler_enabled); setStartTime(r.crawler_start_time); setStopTime(null);
      onStateChange({ crawler_enabled: r.crawler_enabled, crawler_start_time: r.crawler_start_time, crawler_stop_time: null });
      flash("已開始爬取");
    } catch (e) { setErr(extractErr(e)); } finally { setBusy(false); }
  }

  async function handleStop() {
    if (!confirm(`停止爬取「${scopeName}」？`)) return;
    setBusy(true); setErr("");
    try {
      const r = await stopScopeCrawler(scopeType, scopeId);
      setEnabled(r.crawler_enabled); setStopTime(r.crawler_stop_time);
      onStateChange({ crawler_enabled: r.crawler_enabled, crawler_stop_time: r.crawler_stop_time });
      flash("已停止爬取");
    } catch (e) { setErr(extractErr(e)); } finally { setBusy(false); }
  }

  async function handleSaveYears() {
    setBusy(true); setErr("");
    try {
      await updateScopeCrawlerConfig(scopeType, scopeId, { crawler_years: years });
      onStateChange({ crawler_years: years });
      flash("已儲存年限設定");
    } catch (e) { setErr(extractErr(e)); } finally { setBusy(false); }
  }

  async function handleAddIndicators() {
    if (addIndSelected.length === 0) return;
    setBusy(true); setErr("");
    try {
      const results: AssetCrawlerIndicatorRow[] = [];
      for (const indId of addIndSelected) {
        const ind = allIndicators.find(i => i.id === indId);
        if (!ind) continue;
        try {
          results.push(await addScopeCrawlerIndicator(scopeType, scopeId, {
            indicator_id: ind.id, indicator_name: ind.display_name,
            indicator_type: ind.indicator_category ?? undefined,
            api_source_id: addIndApiId ? Number(addIndApiId) : null,
            crawl_frequency: addIndFreq, crawl_time: addIndTime,
          }));
        } catch { /* skip duplicates */ }
      }
      setCrawlerInds(prev => [...prev, ...results]);
      setAddIndSelected([]); setAddIndOpen(false);
      flash(`已新增 ${results.length} 個指標`);
    } catch (e) { setErr(extractErr(e)); } finally { setBusy(false); }
  }

  async function handleUpdateInd(id: number, patch: Partial<AssetCrawlerIndicatorRow>) {
    try {
      const updated = await updateScopeCrawlerIndicator(scopeType, scopeId, id, patch);
      setCrawlerInds(prev => prev.map(r => r.id === id ? updated : r));
    } catch (e) { setErr(extractErr(e)); }
  }

  async function handleDeleteInd(id: number) {
    if (!confirm("確定移除此指標的爬蟲設定？")) return;
    try { await deleteScopeCrawlerIndicator(scopeType, scopeId, id); setCrawlerInds(prev => prev.filter(r => r.id !== id)); }
    catch (e) { alert(extractErr(e)); }
  }

  async function handleCrawlNow(id: number) {
    try { const u = await crawlScopeIndicatorNow(scopeType, scopeId, id); setCrawlerInds(prev => prev.map(r => r.id === id ? u : r)); flash("已觸發立即爬蟲"); }
    catch (e) { setErr(extractErr(e)); }
  }

  async function handleStopInd(id: number) {
    try { const u = await stopScopeCrawlerIndicator(scopeType, scopeId, id); setCrawlerInds(prev => prev.map(r => r.id === id ? u : r)); flash("已停止"); }
    catch (e) { setErr(extractErr(e)); }
  }

  const FREQ_OPTS = [{ value: "daily", label: "每日" }, { value: "weekly", label: "每週" }, { value: "monthly", label: "每月" }, { value: "quarterly", label: "每季" }, { value: "cron", label: "自訂 Cron" }];
  const STATUS_COLOR: Record<string, string> = { waiting: "bg-slate-100 text-slate-500", running: "bg-blue-50 text-blue-600", success: "bg-emerald-50 text-emerald-600", failed: "bg-red-50 text-red-600", stopped: "bg-amber-50 text-amber-500" };
  const STATUS_LABEL: Record<string, string> = { waiting: "等待中", running: "執行中", success: "成功", failed: "失敗", stopped: "已停止" };
  const TYPE_COLOR: Record<string, string> = { fundamental: "bg-blue-50 text-blue-600", technical: "bg-purple-50 text-purple-600", chips: "bg-amber-50 text-amber-600", market: "bg-sky-50 text-sky-600", industry: "bg-teal-50 text-teal-600" };
  const TYPE_LABEL: Record<string, string> = { fundamental: "基本面", technical: "技術面", chips: "籌碼面", market: "市場", industry: "產業" };
  const STOCK_TYPES = new Set(["fundamental", "technical", "chips"]);
  function getL1(t: string | null) { if (!t) return ""; if (STOCK_TYPES.has(t)) return "stock"; return t; }

  const configuredIds = new Set(crawlerInds.map(r => r.indicator_id).filter(Boolean));
  const filteredInds = crawlerInds.filter(r => {
    if (indL1Filter && getL1(r.indicator_type) !== indL1Filter) return false;
    if (indL1Filter === "stock" && indTypeFilter && r.indicator_type !== indTypeFilter) return false;
    return true;
  });
  const addableItems = allIndicators.filter(i => !configuredIds.has(i.id)).map(i => ({
    id: i.id, label: `[${TYPE_LABEL[i.indicator_category ?? ""] ?? i.indicator_category ?? "其他"}] ${i.display_name}`,
  }));
  const scopeLabel = scopeType === "market" ? "市場" : "產業";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">爬蟲模組 — {scopeLabel}：{scopeName}</h2>
            <p className="mt-0.5 text-xs text-slate-400">設定{scopeLabel}指標的自動爬取與即時爬取</p>
          </div>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} type="button">✕</button>
        </div>
        <div className="flex gap-1 border-b border-slate-100 bg-slate-50 px-4 pt-2">
          {([{ k: "settings", l: "爬蟲設定" }, { k: "indicators", l: "指標設定" }] as { k: SCTab; l: string }[]).map(t => (
            <button key={t.k} type="button" onClick={() => setTab(t.k)}
              className={["rounded-t-lg px-4 py-2 text-sm font-medium transition-colors", tab === t.k ? "bg-white border border-b-white border-slate-200 text-indigo-600 -mb-px" : "text-slate-500 hover:text-slate-700"].join(" ")}>
              {t.l}
            </button>
          ))}
        </div>
        <div className="min-h-72 max-h-[70vh] overflow-y-auto px-6 py-5">
          {err && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>}
          {ok && <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">{ok}</div>}

          {/* ── 爬蟲設定 ── */}
          {tab === "settings" && (
            <div className="flex flex-col gap-5">
              <div className={["rounded-xl border p-4", enabled ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"].join(" ")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">爬蟲狀態</p>
                    <p className={["mt-0.5 text-lg font-bold", enabled ? "text-emerald-600" : "text-slate-400"].join(" ")}>
                      {enabled ? "運行中" : startTime ? "已停止" : "未啟動"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed" disabled={busy || enabled} onClick={handleStart} type="button">開始爬取</button>
                    <button className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed" disabled={busy || !enabled} onClick={handleStop} type="button">停止爬取</button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                  <div><span className="font-medium text-slate-600">開始時間：</span>{startTime ? new Date(startTime).toLocaleString("zh-TW") : "未開始"}</div>
                  <div><span className="font-medium text-slate-600">停止時間：</span>{stopTime ? new Date(stopTime).toLocaleString("zh-TW") : "—"}</div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">初始歷史回補年限</label>
                <p className="text-xs text-slate-400 leading-relaxed">系統首次啟動時將依設定年限回補歷史資料。歷史資料建立完成後，系統將持續增量更新並永久保存資料。</p>
                <div className="flex items-center gap-3">
                  <select className={inputCls + " w-44"} value={String(years)} onChange={e => setYears(Number(e.target.value))}>
                    <option value="3">3 年</option><option value="5">5 年</option><option value="10">10 年（預設）</option><option value="20">20 年</option><option value="0">完整歷史資料</option>
                  </select>
                  <button className={btnPrimary} disabled={busy} onClick={handleSaveYears} type="button">儲存</button>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                <p className="font-medium text-slate-600 mb-1">自動爬取說明</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>每日自動更新最新資料</li>
                  <li>系統會重新抓取最近一筆資料，避免資料尚未結算造成誤差</li>
                  <li>首次啟動時依「初始歷史回補年限」回補歷史資料</li>
                  <li>歷史資料建立後將持續累積保存，不會因年限設定而自動刪除</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── 指標設定 ── */}
          {tab === "indicators" && (
            <div className="flex flex-col gap-4">
              {/* Add indicators */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">新增指標</p>
                  <button className="text-xs text-indigo-600 hover:text-indigo-800" type="button" onClick={() => setAddIndOpen(v => !v)}>{addIndOpen ? "收起 ▲" : "展開 ▼"}</button>
                </div>
                {addIndOpen && (
                  <div className="flex flex-col gap-3">
                    <SearchableMultiSelect items={addableItems} selectedIds={addIndSelected} onToggle={id => setAddIndSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} placeholder="搜尋指標名稱或類型…" />
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="text-xs text-slate-500">API 來源</label>
                        <select className={inputCls} value={addIndApiId} onChange={e => setAddIndApiId(e.target.value)}>
                          <option value="">— 不指定 —</option>
                          {apiConfigs.filter(a => a.is_active).map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                        </select>
                      </div>
                      <div><label className="text-xs text-slate-500">更新頻率</label>
                        <select className={inputCls} value={addIndFreq} onChange={e => setAddIndFreq(e.target.value)}>
                          {FREQ_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div><label className="text-xs text-slate-500">更新時間</label>
                        <input className={inputCls} placeholder="09:00 或 cron" value={addIndTime} onChange={e => setAddIndTime(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">已選 {addIndSelected.length} 個</span>
                      <button className={btnPrimary} disabled={busy || addIndSelected.length === 0} onClick={handleAddIndicators} type="button">加入</button>
                    </div>
                  </div>
                )}
              </div>
              {/* Two-level filter */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[{ v: "", l: "全部" }, { v: "market", l: "市場指標" }, { v: "industry", l: "產業指標" }, { v: "stock", l: "股票指標" }].map(f => (
                    <button key={f.v} type="button" onClick={() => { setIndL1Filter(f.v); setIndTypeFilter(""); }}
                      className={["rounded-full px-3 py-1 text-xs font-medium transition-colors", indL1Filter === f.v ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"].join(" ")}>{f.l}</button>
                  ))}
                  <span className="ml-auto text-xs text-slate-400">{filteredInds.length} 個</span>
                  <button className={btnSecondary + " py-1 text-xs"} onClick={loadInds} type="button">重新整理</button>
                </div>
                {indL1Filter === "stock" && (
                  <div className="flex items-center gap-1.5 pl-4 border-l-2 border-indigo-200">
                    {[{ v: "", l: "全部子類" }, { v: "fundamental", l: "基本面" }, { v: "technical", l: "技術面" }, { v: "chips", l: "籌碼面" }].map(f => (
                      <button key={f.v} type="button" onClick={() => setIndTypeFilter(f.v)}
                        className={["rounded-full px-3 py-1 text-xs font-medium transition-colors", indTypeFilter === f.v ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"].join(" ")}>{f.l}</button>
                    ))}
                  </div>
                )}
              </div>
              {/* List */}
              {indLoading ? <p className="py-8 text-center text-sm text-slate-400">載入中…</p>
                : filteredInds.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">尚未設定指標，請點上方「展開」新增</p>
                : (
                  <div className="flex flex-col gap-2">
                    {filteredInds.map(ind => {
                      const isExp = expandedIndId === ind.id;
                      const edit = indEditMap[ind.id] ?? {};
                      return (
                        <div key={ind.id} className={["rounded-xl border transition-colors", isExp ? "border-indigo-200 bg-indigo-50/30" : "border-slate-100 bg-white"].join(" ")}>
                          <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
                            {ind.indicator_type && <span className={["rounded-full px-2 py-0.5 text-[10px] font-medium", TYPE_COLOR[ind.indicator_type] ?? "bg-slate-100 text-slate-500"].join(" ")}>{TYPE_LABEL[ind.indicator_type] ?? ind.indicator_type}</span>}
                            <span className="font-medium text-sm text-slate-800 flex-1 min-w-0 truncate">{ind.indicator_name}</span>
                            <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer"><input type="checkbox" checked={ind.is_enabled} className="h-3.5 w-3.5 accent-indigo-500" onChange={e => handleUpdateInd(ind.id, { is_enabled: e.target.checked })} />顯示</label>
                            <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer"><input type="checkbox" checked={ind.auto_crawl_enabled} className="h-3.5 w-3.5 accent-emerald-500" onChange={e => handleUpdateInd(ind.id, { auto_crawl_enabled: e.target.checked })} />自動</label>
                            <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer"><input type="checkbox" checked={ind.manual_crawl_enabled} className="h-3.5 w-3.5 accent-sky-500" onChange={e => handleUpdateInd(ind.id, { manual_crawl_enabled: e.target.checked })} />手動</label>
                            <span className={["rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_COLOR[ind.crawl_status] ?? "bg-slate-100 text-slate-500"].join(" ")}>{STATUS_LABEL[ind.crawl_status] ?? ind.crawl_status}</span>
                            <button className={["rounded px-2 py-0.5 text-xs font-medium", ind.is_enabled && ind.manual_crawl_enabled ? "bg-sky-500 text-white hover:bg-sky-600" : "bg-slate-100 text-slate-400 cursor-not-allowed"].join(" ")} disabled={!ind.is_enabled || !ind.manual_crawl_enabled} onClick={() => handleCrawlNow(ind.id)} type="button">立即爬蟲</button>
                            <button className="rounded px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100" onClick={() => handleStopInd(ind.id)} type="button">停止</button>
                            <button className={["rounded px-2 py-0.5 text-xs font-medium", isExp ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"].join(" ")} onClick={() => { setExpandedIndId(isExp ? null : ind.id); if (!indEditMap[ind.id]) setIndEditMap(m => ({ ...m, [ind.id]: {} })); }} type="button">{isExp ? "收起 ▲" : "設定 ▼"}</button>
                            <button className={btnDanger + " py-0.5"} onClick={() => handleDeleteInd(ind.id)} type="button">移除</button>
                          </div>
                          {isExp && (
                            <div className="border-t border-indigo-100 px-4 pb-4 pt-3 flex flex-col gap-3">
                              <div className="grid grid-cols-3 gap-3">
                                <div><label className="text-xs text-slate-500">API 來源</label>
                                  <select className={inputCls} value={String(edit.api_source_id ?? ind.api_source_id ?? "")} onChange={e => setIndEditMap(m => ({ ...m, [ind.id]: { ...m[ind.id], api_source_id: e.target.value ? Number(e.target.value) : null } }))}>
                                    <option value="">— 不指定 —</option>
                                    {apiConfigs.filter(a => a.is_active).map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                                  </select>
                                </div>
                                <div><label className="text-xs text-slate-500">更新頻率</label>
                                  <select className={inputCls} value={edit.crawl_frequency ?? ind.crawl_frequency ?? "daily"} onChange={e => setIndEditMap(m => ({ ...m, [ind.id]: { ...m[ind.id], crawl_frequency: e.target.value } }))}>
                                    {FREQ_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                  </select>
                                </div>
                                <div><label className="text-xs text-slate-500">更新時間</label>
                                  <input className={inputCls} placeholder="09:00 或 cron" value={edit.crawl_time ?? ind.crawl_time ?? ""} onChange={e => setIndEditMap(m => ({ ...m, [ind.id]: { ...m[ind.id], crawl_time: e.target.value } }))} />
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-xs text-slate-500">
                                <div><span className="font-medium text-slate-600">最後更新：</span>{ind.last_crawled_at ? new Date(ind.last_crawled_at).toLocaleString("zh-TW") : "—"}</div>
                                <div><span className="font-medium text-slate-600">下次更新：</span>{ind.next_crawl_at ? new Date(ind.next_crawl_at).toLocaleString("zh-TW") : "—"}</div>
                                <div><span className="font-medium text-slate-600">手動更新：</span>{ind.last_manual_crawled_at ? new Date(ind.last_manual_crawled_at).toLocaleString("zh-TW") : "—"}</div>
                              </div>
                              {ind.error_message && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{ind.error_message}</p>}
                              <div className="flex justify-end">
                                <button className={btnPrimary + " py-1.5 text-xs"} onClick={async () => { const patch = { ...indEditMap[ind.id] }; if (!Object.keys(patch).length) return; await handleUpdateInd(ind.id, patch); setIndEditMap(m => ({ ...m, [ind.id]: {} })); flash("已儲存"); }} type="button">儲存此指標設定</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          )}
        </div>
        <div className="flex justify-end border-t border-slate-100 px-6 py-3">
          <button className={btnSecondary} onClick={onClose} type="button">關閉</button>
        </div>
      </div>
    </div>
  );
}

// Crawler Modal
// ─────────────────────────────────────────────────────────────────────────────

type CrawlerTab = "settings" | "indicators" | "data";

function AssetCrawlerModal({ asset: initAsset, allIndicators, apiConfigs, onClose, onSaved }: {
  asset: AssetRow;
  allIndicators: MarketIndicatorConfig[];
  apiConfigs: ApiConfig[];
  onClose: () => void;
  onSaved: (updated: AssetRow) => void;
}) {
  const [asset, setAsset] = useState<AssetRow>(initAsset);
  const [tab, setTab] = useState<CrawlerTab>("settings");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // settings tab
  const [years, setYears] = useState(initAsset.crawler_years ?? 10);

  // indicators tab (per-indicator config)
  const [crawlerInds, setCrawlerInds] = useState<AssetCrawlerIndicatorRow[]>([]);
  const [indLoading, setIndLoading] = useState(false);
  const [expandedIndId, setExpandedIndId] = useState<number | null>(null);
  const [indL1Filter, setIndL1Filter] = useState<string>("");   // "" | "market" | "industry" | "stock"
  const [indTypeFilter, setIndTypeFilter] = useState<string>(""); // L2: "" | "fundamental" | "technical" | "chips"
  // add-indicator panel
  const [addIndOpen, setAddIndOpen] = useState(false);
  const [addIndSelected, setAddIndSelected] = useState<number[]>([]);
  const [addIndFreq, setAddIndFreq] = useState("daily");
  const [addIndTime, setAddIndTime] = useState("09:00");
  const [addIndApiId, setAddIndApiId] = useState<string>("");
  // expanded row edit state: keyed by config id
  const [indEditMap, setIndEditMap] = useState<Record<number, Partial<AssetCrawlerIndicatorRow>>>({});

  // data tab
  const [dataRows, setDataRows] = useState<AssetDailyDataRow[]>([]);
  const [dataTotal, setDataTotal] = useState(0);
  const [dataPage, setDataPage] = useState(0);
  const [dataFilter, setDataFilter] = useState("");
  const [dataLoading, setDataLoading] = useState(false);
  const [addForm, setAddForm] = useState({ record_date: "", field_key: "", display_name: "", category: "fundamental", value: "", notes: "" });
  const [addOpen, setAddOpen] = useState(false);

  const dataLimit = 20;

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const r = await listCrawlerData(asset.id, { skip: dataPage * dataLimit, limit: dataLimit, field_key: dataFilter || undefined });
      setDataRows(r.items);
      setDataTotal(r.total);
    } catch { /* ignore */ } finally { setDataLoading(false); }
  }, [asset.id, dataPage, dataFilter]);

  const loadCrawlerInds = useCallback(async () => {
    setIndLoading(true);
    try { setCrawlerInds(await listCrawlerIndicators(asset.id)); } catch { /* ignore */ } finally { setIndLoading(false); }
  }, [asset.id]);

  useEffect(() => {
    if (tab === "data") loadData();
    if (tab === "indicators") loadCrawlerInds();
  }, [tab, loadData, loadCrawlerInds]);

  function flash(msg: string) { setOk(msg); setTimeout(() => setOk(""), 3000); }

  async function handleStart() {
    if (!confirm(`開始爬取「${asset.symbol}」的歷史資料？`)) return;
    setBusy(true); setErr("");
    try {
      const r = await startCrawler(asset.id);
      const updated = { ...asset, crawler_enabled: r.crawler_enabled, crawler_start_time: r.crawler_start_time };
      setAsset(updated); onSaved(updated as AssetRow);
      flash("已開始爬取");
    } catch (e) { setErr(extractErr(e)); } finally { setBusy(false); }
  }

  async function handleStop() {
    if (!confirm(`停止爬取「${asset.symbol}」？`)) return;
    setBusy(true); setErr("");
    try {
      const r = await stopCrawler(asset.id);
      const updated = { ...asset, crawler_enabled: r.crawler_enabled, crawler_stop_time: r.crawler_stop_time };
      setAsset(updated); onSaved(updated as AssetRow);
      flash("已停止爬取");
    } catch (e) { setErr(extractErr(e)); } finally { setBusy(false); }
  }

  async function handleSaveYears() {
    setBusy(true); setErr("");
    try {
      await updateCrawlerConfig(asset.id, { crawler_years: years });
      const updated = { ...asset, crawler_years: years };
      setAsset(updated); onSaved(updated as AssetRow);
      flash("已儲存年限設定");
    } catch (e) { setErr(extractErr(e)); } finally { setBusy(false); }
  }


  async function handleAddIndicators() {
    if (addIndSelected.length === 0) return;
    setBusy(true); setErr("");
    try {
      const results: AssetCrawlerIndicatorRow[] = [];
      for (const indId of addIndSelected) {
        const ind = allIndicators.find(i => i.id === indId);
        if (!ind) continue;
        try {
          const row = await addCrawlerIndicator(asset.id, {
            indicator_id: ind.id,
            indicator_name: ind.display_name,
            indicator_type: ind.indicator_category ?? undefined,
            api_source_id: addIndApiId ? Number(addIndApiId) : null,
            crawl_frequency: addIndFreq,
            crawl_time: addIndTime,
          });
          results.push(row);
        } catch { /* skip duplicates */ }
      }
      setCrawlerInds(prev => [...prev, ...results]);
      setAddIndSelected([]); setAddIndOpen(false);
      flash(`已新增 ${results.length} 個指標`);
    } catch (e) { setErr(extractErr(e)); } finally { setBusy(false); }
  }

  async function handleUpdateInd(id: number, patch: Partial<AssetCrawlerIndicatorRow>) {
    try {
      const updated = await updateCrawlerIndicator(asset.id, id, patch);
      setCrawlerInds(prev => prev.map(r => r.id === id ? updated : r));
    } catch (e) { setErr(extractErr(e)); }
  }

  async function handleDeleteInd(id: number) {
    if (!confirm("確定移除此指標的爬蟲設定？")) return;
    try {
      await deleteCrawlerIndicator(asset.id, id);
      setCrawlerInds(prev => prev.filter(r => r.id !== id));
      setExpandedIndId(null);
    } catch (e) { alert(extractErr(e)); }
  }

  async function handleCrawlNow(id: number) {
    try {
      const updated = await crawlIndicatorNow(asset.id, id);
      setCrawlerInds(prev => prev.map(r => r.id === id ? updated : r));
      flash("已觸發立即爬蟲");
    } catch (e) { setErr(extractErr(e)); }
  }

  async function handleStopInd(id: number) {
    try {
      const updated = await stopCrawlerIndicator(asset.id, id);
      setCrawlerInds(prev => prev.map(r => r.id === id ? updated : r));
      flash("已停止爬蟲");
    } catch (e) { setErr(extractErr(e)); }
  }

  async function handleDeleteRecord(id: number) {
    if (!confirm("確定刪除此筆資料？")) return;
    try { await deleteCrawlerData(asset.id, id); loadData(); } catch (e) { alert(extractErr(e)); }
  }

  async function handleAddRecord() {
    if (!addForm.record_date || !addForm.field_key || !addForm.display_name) { setErr("請填寫日期、指標鍵值與名稱"); return; }
    setBusy(true); setErr("");
    try {
      await addCrawlerData(asset.id, {
        record_date: addForm.record_date,
        field_key: addForm.field_key,
        display_name: addForm.display_name,
        category: addForm.category,
        value: addForm.value ? Number(addForm.value) : undefined,
        notes: addForm.notes || undefined,
      });
      setAddOpen(false);
      setAddForm({ record_date: "", field_key: "", display_name: "", category: "fundamental", value: "", notes: "" });
      loadData();
    } catch (e) { setErr(extractErr(e)); } finally { setBusy(false); }
  }

  // group indicators by category for multi-select

  const CRAWLER_TABS: { key: CrawlerTab; label: string }[] = [
    { key: "settings", label: "爬蟲設定" },
    { key: "indicators", label: "指標設定" },
    { key: "data", label: "資料管理" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">爬蟲模組 — {asset.symbol} {asset.name}</h2>
            <p className="mt-0.5 text-xs text-slate-400">設定自動資料爬取、指標選擇與資料管理</p>
          </div>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} type="button">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-100 bg-slate-50 px-4 pt-2">
          {CRAWLER_TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={["rounded-t-lg px-4 py-2 text-sm font-medium transition-colors", tab === t.key ? "bg-white border border-b-white border-slate-200 text-indigo-600 -mb-px" : "text-slate-500 hover:text-slate-700"].join(" ")}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="min-h-80 overflow-y-auto px-6 py-5">
          {err && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>}
          {ok && <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">{ok}</div>}

          {/* ── 爬蟲設定 ── */}
          {tab === "settings" && (
            <div className="flex flex-col gap-5">
              {/* Status card */}
              <div className={["rounded-xl border p-4", asset.crawler_enabled ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"].join(" ")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">爬蟲狀態</p>
                    <p className={["mt-0.5 text-lg font-bold", asset.crawler_enabled ? "text-emerald-600" : "text-slate-400"].join(" ")}>
                      {asset.crawler_enabled ? "運行中" : asset.crawler_start_time ? "已停止" : "未啟動"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={busy || asset.crawler_enabled}
                      onClick={handleStart}
                      type="button"
                    >開始爬取</button>
                    <button
                      className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={busy || !asset.crawler_enabled}
                      onClick={handleStop}
                      type="button"
                    >停止爬取</button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                  <div><span className="font-medium text-slate-600">開始時間：</span>{asset.crawler_start_time ? new Date(asset.crawler_start_time).toLocaleString("zh-TW") : "未開始"}</div>
                  <div><span className="font-medium text-slate-600">停止時間：</span>{asset.crawler_stop_time ? new Date(asset.crawler_stop_time).toLocaleString("zh-TW") : "—"}</div>
                </div>
              </div>

              {/* Years setting */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">初始歷史回補年限</label>
                <p className="text-xs text-slate-400 leading-relaxed">
                  系統首次啟動時將依設定年限回補歷史資料。<br />
                  若標的實際成立時間短於設定年限，則自動以實際成立時間為準。<br />
                  歷史資料建立完成後，系統將持續增量更新並永久保存資料。
                </p>
                <div className="flex items-center gap-3">
                  <select className={inputCls + " w-44"} value={String(years)} onChange={e => setYears(Number(e.target.value))}>
                    <option value="3">3 年</option>
                    <option value="5">5 年</option>
                    <option value="10">10 年（預設）</option>
                    <option value="20">20 年</option>
                    <option value="0">完整歷史資料</option>
                  </select>
                  <button className={btnPrimary} disabled={busy} onClick={handleSaveYears} type="button">儲存</button>
                </div>
              </div>

              {/* Info */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                <p className="font-medium text-slate-600 mb-1">自動爬取說明</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>每日自動更新最新資料</li>
                  <li>系統會重新抓取最近一筆資料，避免資料尚未結算造成誤差</li>
                  <li>首次啟動時依「初始歷史回補年限」回補歷史資料</li>
                  <li>歷史資料建立後將持續累積保存，不會因年限設定而自動刪除</li>
                  <li>後續模型回測、模型績效、因子分析皆使用累積歷史資料</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── 指標設定 ── */}
          {tab === "indicators" && (() => {
            const FREQ_OPTS = [
              { value: "daily", label: "每日" },
              { value: "weekly", label: "每週" },
              { value: "monthly", label: "每月" },
              { value: "quarterly", label: "每季" },
              { value: "cron", label: "自訂 Cron" },
            ];
            const STATUS_COLOR: Record<string, string> = {
              waiting: "bg-slate-100 text-slate-500",
              running: "bg-blue-50 text-blue-600",
              success: "bg-emerald-50 text-emerald-600",
              failed: "bg-red-50 text-red-600",
              stopped: "bg-amber-50 text-amber-500",
            };
            const STATUS_LABEL: Record<string, string> = { waiting: "等待中", running: "執行中", success: "成功", failed: "失敗", stopped: "已停止" };
            const TYPE_COLOR: Record<string, string> = { fundamental: "bg-blue-50 text-blue-600", technical: "bg-purple-50 text-purple-600", chips: "bg-amber-50 text-amber-600" };
            const TYPE_LABEL: Record<string, string> = { fundamental: "基本面", technical: "技術面", chips: "籌碼面" };

            // derive L1 scope from indicator_type
            const STOCK_TYPES = new Set(["fundamental", "technical", "chips"]);
            function getL1(t: string | null): string {
              if (!t) return "";
              if (STOCK_TYPES.has(t)) return "stock";
              if (t === "market") return "market";
              if (t === "industry") return "industry";
              return "";
            }

            // filter already-configured indicator IDs
            const configuredIds = new Set(crawlerInds.map(r => r.indicator_id).filter(Boolean));
            const filteredInds = crawlerInds.filter(r => {
              if (indL1Filter && getL1(r.indicator_type) !== indL1Filter) return false;
              if (indL1Filter === "stock" && indTypeFilter && r.indicator_type !== indTypeFilter) return false;
              return true;
            });
            const addableItems = allIndicators.filter(i => !configuredIds.has(i.id)).map(i => ({
              id: i.id,
              label: `[${TYPE_LABEL[i.indicator_category ?? ""] ?? i.indicator_category ?? "其他"}] ${i.display_name}`,
            }));

            return (
              <div className="flex flex-col gap-4">
                {/* Add indicators panel */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">新增指標</p>
                    <button className="text-xs text-indigo-600 hover:text-indigo-800" type="button" onClick={() => setAddIndOpen(v => !v)}>{addIndOpen ? "收起 ▲" : "展開 ▼"}</button>
                  </div>
                  {addIndOpen && (
                    <div className="flex flex-col gap-3">
                      <SearchableMultiSelect items={addableItems} selectedIds={addIndSelected} onToggle={id => setAddIndSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} placeholder="搜尋指標名稱或類型…" />
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-slate-500">API 來源</label>
                          <select className={inputCls} value={addIndApiId} onChange={e => setAddIndApiId(e.target.value)}>
                            <option value="">— 不指定 —</option>
                            {apiConfigs.filter(a => a.is_active).map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">更新頻率</label>
                          <select className={inputCls} value={addIndFreq} onChange={e => setAddIndFreq(e.target.value)}>
                            {FREQ_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">更新時間</label>
                          <input className={inputCls} placeholder="09:00 或 cron" value={addIndTime} onChange={e => setAddIndTime(e.target.value)} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">已選 {addIndSelected.length} 個指標</span>
                        <button className={btnPrimary} disabled={busy || addIndSelected.length === 0} onClick={handleAddIndicators} type="button">加入</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Two-level filter */}
                <div className="flex flex-col gap-2">
                  {/* L1 */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[{ v: "", l: "全部" }, { v: "market", l: "市場指標" }, { v: "industry", l: "產業指標" }, { v: "stock", l: "股票指標" }].map(f => (
                      <button key={f.v} type="button"
                        onClick={() => { setIndL1Filter(f.v); setIndTypeFilter(""); }}
                        className={["rounded-full px-3 py-1 text-xs font-medium transition-colors", indL1Filter === f.v ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"].join(" ")}>
                        {f.l}
                      </button>
                    ))}
                    <span className="ml-auto text-xs text-slate-400">{filteredInds.length} 個指標</span>
                    <button className={btnSecondary + " py-1 text-xs"} onClick={loadCrawlerInds} type="button">重新整理</button>
                  </div>
                  {/* L2 — shown only when stock is selected */}
                  {indL1Filter === "stock" && (
                    <div className="flex items-center gap-1.5 pl-4 border-l-2 border-indigo-200">
                      {[{ v: "", l: "全部子類" }, { v: "fundamental", l: "基本面" }, { v: "technical", l: "技術面" }, { v: "chips", l: "籌碼面" }].map(f => (
                        <button key={f.v} type="button"
                          onClick={() => setIndTypeFilter(f.v)}
                          className={["rounded-full px-3 py-1 text-xs font-medium transition-colors", indTypeFilter === f.v ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"].join(" ")}>
                          {f.l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Indicator list */}
                {indLoading ? (
                  <p className="text-center text-sm text-slate-400 py-6">載入中…</p>
                ) : filteredInds.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-6">尚未設定指標，請點上方「展開」新增</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredInds.map(ind => {
                      const isExpanded = expandedIndId === ind.id;
                      const edit = indEditMap[ind.id] ?? {};
                      const apiName = apiConfigs.find(a => a.id === ind.api_source_id)?.name;
                      return (
                        <div key={ind.id} className={["rounded-xl border transition-colors", isExpanded ? "border-indigo-200 bg-indigo-50/30" : "border-slate-100 bg-white"].join(" ")}>
                          {/* Main row */}
                          <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
                            {ind.indicator_type && (
                              <span className={["rounded-full px-2 py-0.5 text-[10px] font-medium", TYPE_COLOR[ind.indicator_type] ?? "bg-slate-100 text-slate-500"].join(" ")}>
                                {TYPE_LABEL[ind.indicator_type] ?? ind.indicator_type}
                              </span>
                            )}
                            <span className="font-medium text-sm text-slate-800 flex-1 min-w-0 truncate">{ind.indicator_name}</span>
                            {apiName && <span className="text-xs text-slate-400">API: {apiName}</span>}
                            {/* Toggles */}
                            <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer" title="顯示於前台">
                              <input type="checkbox" checked={ind.is_enabled} className="h-3.5 w-3.5 accent-indigo-500"
                                onChange={e => handleUpdateInd(ind.id, { is_enabled: e.target.checked })} />
                              顯示
                            </label>
                            <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer" title="自動爬蟲">
                              <input type="checkbox" checked={ind.auto_crawl_enabled} className="h-3.5 w-3.5 accent-emerald-500"
                                onChange={e => handleUpdateInd(ind.id, { auto_crawl_enabled: e.target.checked })} />
                              自動
                            </label>
                            <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer" title="手動爬蟲">
                              <input type="checkbox" checked={ind.manual_crawl_enabled} className="h-3.5 w-3.5 accent-sky-500"
                                onChange={e => handleUpdateInd(ind.id, { manual_crawl_enabled: e.target.checked })} />
                              手動
                            </label>
                            <span className={["rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_COLOR[ind.crawl_status] ?? "bg-slate-100 text-slate-500"].join(" ")}>
                              {STATUS_LABEL[ind.crawl_status] ?? ind.crawl_status}
                            </span>
                            {/* Actions */}
                            <button
                              className={["rounded px-2 py-0.5 text-xs font-medium transition-colors", ind.is_enabled && ind.manual_crawl_enabled ? "bg-sky-500 text-white hover:bg-sky-600" : "bg-slate-100 text-slate-400 cursor-not-allowed"].join(" ")}
                              disabled={!ind.is_enabled || !ind.manual_crawl_enabled} onClick={() => handleCrawlNow(ind.id)} type="button">
                              立即爬蟲
                            </button>
                            <button
                              className="rounded px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100"
                              onClick={() => handleStopInd(ind.id)} type="button">
                              停止
                            </button>
                            <button
                              className={["rounded px-2 py-0.5 text-xs font-medium transition-colors", isExpanded ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"].join(" ")}
                              onClick={() => { setExpandedIndId(isExpanded ? null : ind.id); if (!indEditMap[ind.id]) setIndEditMap(m => ({ ...m, [ind.id]: {} })); }} type="button">
                              {isExpanded ? "收起 ▲" : "設定 ▼"}
                            </button>
                            <button className={btnDanger + " py-0.5"} onClick={() => handleDeleteInd(ind.id)} type="button">移除</button>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="border-t border-indigo-100 px-4 pb-4 pt-3 flex flex-col gap-3">
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                <div>
                                  <label className="text-xs text-slate-500">API 來源</label>
                                  <select className={inputCls} value={String(edit.api_source_id ?? ind.api_source_id ?? "")}
                                    onChange={e => setIndEditMap(m => ({ ...m, [ind.id]: { ...m[ind.id], api_source_id: e.target.value ? Number(e.target.value) : null } }))}>
                                    <option value="">— 不指定 —</option>
                                    {apiConfigs.filter(a => a.is_active).map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-slate-500">更新頻率</label>
                                  <select className={inputCls} value={edit.crawl_frequency ?? ind.crawl_frequency ?? "daily"}
                                    onChange={e => setIndEditMap(m => ({ ...m, [ind.id]: { ...m[ind.id], crawl_frequency: e.target.value } }))}>
                                    {FREQ_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-slate-500">更新時間</label>
                                  <input className={inputCls} placeholder="09:00 或 cron" value={edit.crawl_time ?? ind.crawl_time ?? ""}
                                    onChange={e => setIndEditMap(m => ({ ...m, [ind.id]: { ...m[ind.id], crawl_time: e.target.value } }))} />
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-xs text-slate-500">
                                <div><span className="font-medium text-slate-600">最後更新：</span>{ind.last_crawled_at ? new Date(ind.last_crawled_at).toLocaleString("zh-TW") : "—"}</div>
                                <div><span className="font-medium text-slate-600">下次更新：</span>{ind.next_crawl_at ? new Date(ind.next_crawl_at).toLocaleString("zh-TW") : "—"}</div>
                                <div><span className="font-medium text-slate-600">手動更新：</span>{ind.last_manual_crawled_at ? new Date(ind.last_manual_crawled_at).toLocaleString("zh-TW") : "—"}</div>
                              </div>
                              {ind.error_message && (
                                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{ind.error_message}</p>
                              )}
                              <div className="flex justify-end">
                                <button className={btnPrimary + " py-1.5 text-xs"} onClick={async () => {
                                  const patch = { ...indEditMap[ind.id] };
                                  if (Object.keys(patch).length === 0) return;
                                  await handleUpdateInd(ind.id, patch);
                                  setIndEditMap(m => ({ ...m, [ind.id]: {} }));
                                  flash("已儲存指標設定");
                                }} type="button">儲存此指標設定</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── 資料管理 ── */}
          {tab === "data" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <input className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 w-48" placeholder="搜尋指標鍵值…" value={dataFilter} onChange={e => { setDataFilter(e.target.value); setDataPage(0); }} />
                <button className={btnSecondary + " py-1.5 text-xs"} onClick={loadData} type="button">重新整理</button>
                <div className="ml-auto">
                  <button className={btnPrimary + " py-1.5 text-xs"} onClick={() => setAddOpen(true)} type="button">+ 新增資料</button>
                </div>
              </div>

              {addOpen && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 flex flex-col gap-3">
                  <p className="text-sm font-medium text-slate-700">新增資料記錄</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-slate-500">日期 *</label><input type="date" className={inputCls} value={addForm.record_date} onChange={e => setAddForm(f => ({ ...f, record_date: e.target.value }))} /></div>
                    <div><label className="text-xs text-slate-500">類別</label>
                      <select className={inputCls} value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}>
                        <option value="fundamental">基本面</option>
                        <option value="technical">技術面</option>
                        <option value="chips">籌碼面</option>
                      </select>
                    </div>
                    <div><label className="text-xs text-slate-500">指標鍵值 *</label><input className={inputCls} placeholder="e.g. pe_ratio" value={addForm.field_key} onChange={e => setAddForm(f => ({ ...f, field_key: e.target.value }))} /></div>
                    <div><label className="text-xs text-slate-500">指標名稱 *</label><input className={inputCls} placeholder="e.g. 本益比" value={addForm.display_name} onChange={e => setAddForm(f => ({ ...f, display_name: e.target.value }))} /></div>
                    <div><label className="text-xs text-slate-500">數值</label><input type="number" className={inputCls} placeholder="數字" value={addForm.value} onChange={e => setAddForm(f => ({ ...f, value: e.target.value }))} /></div>
                    <div><label className="text-xs text-slate-500">備注</label><input className={inputCls} placeholder="選填" value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button className={btnSecondary} onClick={() => setAddOpen(false)} type="button">取消</button>
                    <button className={btnPrimary} disabled={busy} onClick={handleAddRecord} type="button">新增</button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">日期</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">類別</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">指標名稱</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">鍵值</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">數值</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">來源</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataLoading ? (
                      <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-400">載入中…</td></tr>
                    ) : dataRows.length === 0 ? (
                      <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-400">尚無資料</td></tr>
                    ) : dataRows.map(row => (
                      <tr key={row.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                        <td className="px-3 py-2 text-xs text-slate-600 font-mono">{row.record_date}</td>
                        <td className="px-3 py-2 text-xs">
                          <span className={["rounded px-1.5 py-0.5 text-[10px] font-medium", row.category === "fundamental" ? "bg-blue-50 text-blue-600" : row.category === "technical" ? "bg-purple-50 text-purple-600" : "bg-amber-50 text-amber-600"].join(" ")}>
                            {row.category === "fundamental" ? "基本面" : row.category === "technical" ? "技術面" : row.category === "chips" ? "籌碼面" : row.category ?? "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-700">{row.display_name}</td>
                        <td className="px-3 py-2 text-xs font-mono text-slate-500">{row.field_key}</td>
                        <td className="px-3 py-2 text-xs text-right font-mono text-slate-700">{row.value != null ? row.value : row.raw_text ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-slate-400">{row.source ?? "—"}</td>
                        <td className="px-3 py-2">
                          <button className={btnDanger} onClick={() => handleDeleteRecord(row.id)} type="button">刪除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>共 {dataTotal} 筆，第 {dataPage + 1} 頁</span>
                <div className="flex gap-2">
                  <button className={btnSecondary + " py-1 text-xs"} disabled={dataPage === 0} onClick={() => setDataPage(p => p - 1)} type="button">上一頁</button>
                  <button className={btnSecondary + " py-1 text-xs"} disabled={(dataPage + 1) * dataLimit >= dataTotal} onClick={() => setDataPage(p => p + 1)} type="button">下一頁</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 px-6 py-3">
          <button className={btnSecondary} onClick={onClose} type="button">關閉</button>
        </div>
      </div>
    </div>
  );
}

function StocksTab({ industries, markets, assetTypes }: { industries: IndustryRow[]; markets: MarketConfig[]; assetTypes: AssetTypeConfig[] }) {
  const [data, setData] = useState<{ total: number; items: AssetRow[] }>({ total: 0, items: [] });
  const [loading, setLoading] = useState(false);
  const [allIndicators, setAllIndicators] = useState<MarketIndicatorConfig[]>([]);
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [allRoles, setAllRoles] = useState<AssetRole[]>([]);
  const [allModels, setAllModels] = useState<AnalysisModel[]>([]);
  // roles per asset id, loaded in bulk after list loads
  const [rolesMap, setRolesMap] = useState<Record<number, AssetRoleLinkItem[]>>({});
  const [search, setSearch] = useState(""); const [filterMarket, setFilterMarket] = useState(""); const [filterType, setFilterType] = useState(""); const [page, setPage] = useState(0);
  const [addOpen, setAddOpen] = useState(false); const [editAsset, setEditAsset] = useState<AssetRow | null>(null); const [bulkOpen, setBulkOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [moduleConfigAsset, setModuleConfigAsset] = useState<AssetRow | null>(null);
  const [crawlerAsset, setCrawlerAsset] = useState<AssetRow | null>(null);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listAdminAssets({ search: search || undefined, market: filterMarket || undefined, asset_type: filterType || undefined, skip: page * limit, limit });
      setData(r);
      // batch-load roles for all visible assets
      const entries = await Promise.all(
        r.items.map(a => getAssetRoleLinks(a.id).then(roles => [a.id, roles] as [number, AssetRoleLinkItem[]]).catch(() => [a.id, []] as [number, AssetRoleLinkItem[]]))
      );
      setRolesMap(Object.fromEntries(entries));
    } catch { /* silently fail */ } finally { setLoading(false); }
  }, [search, filterMarket, filterType, page]);

  useEffect(() => {
    load();
    listIndicatorConfigs().then(r => setAllIndicators(r)).catch(() => {});
    listApiConfigs().then(r => setApiConfigs(r)).catch(() => {});
    listAssetRoles().then(r => setAllRoles(r)).catch(() => {});
    listAnalysisModels().then(r => setAllModels(r)).catch(() => {});
  }, [load]);

  const indMap = Object.fromEntries(industries.map(i => [i.id, i.industry_name]));
  const atMap = Object.fromEntries(assetTypes.map(t => [t.code, t.name]));
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearch(v: string) { setSearch(v); setPage(0); if (searchTimer.current) clearTimeout(searchTimer.current); searchTimer.current = setTimeout(load, 400); }

  const [bulkText, setBulkText] = useState(`[\n  {\n    "symbol": "006208",\n    "name": "富邦台50",\n    "market": "TW",\n    "asset_type": "etf",\n    "currency": "TWD"\n  }\n]`);
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkErr, setBulkErr] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 w-48" placeholder="搜尋代碼 / 名稱…" value={search} onChange={e => handleSearch(e.target.value)} />
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none" value={filterMarket} onChange={e => { setFilterMarket(e.target.value); setPage(0); }}>
            <option value="">所有市場</option>{markets.map(m => <option key={m.code} value={m.code}>{m.code}</option>)}
          </select>
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(0); }}>
            <option value="">所有類型</option>{assetTypes.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button className={btnSecondary} onClick={() => setBulkOpen(true)} type="button">批次匯入</button>
          <button className={btnPrimary} onClick={() => setAddOpen(true)} type="button">+ 新增股票</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-max w-full">
          <thead className="bg-slate-50"><tr><Th>代碼</Th><Th>名稱</Th><Th>市場</Th><Th>類型</Th><Th>產業</Th><Th>角色</Th><Th>波段選用模型</Th><Th>檔位選用模型</Th><Th>已產生模型</Th><Th>幣別</Th><Th>狀態</Th><Th>操作</Th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={12} className="py-10 text-center text-sm text-slate-400">載入中…</td></tr>
              : data.items.length === 0 ? <tr><td colSpan={12} className="py-10 text-center text-sm text-slate-400">沒有資料</td></tr>
              : data.items.map(a => {
                const swingModel = allModels.find(m => m.id === a.current_model_id);
                const positionModel = allModels.find(m => m.id === a.position_model_id);
                const modelCount = allModels.filter(m => m.source_id === a.id && m.scope_type === "asset").length;
                return (
              <Fragment key={a.id}>
                <tr className={["hover:bg-slate-50/60", !a.crawler_enabled && a.crawler_start_time ? "opacity-50 bg-slate-50" : ""].join(" ")}>
                  <Td><span className="font-mono font-semibold text-slate-900">{a.symbol}</span></Td>
                  <Td>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span>{a.name}</span>
                      {a.in_swing_pool && <span className="rounded px-1 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-600">波段池</span>}
                      {a.in_newsletter && <span className="rounded px-1 py-0.5 text-[10px] font-medium bg-teal-50 text-teal-600">電子報</span>}
                    </div>
                  </Td>
                  <Td><Badge label={a.market} color="bg-blue-50 text-blue-600" /></Td>
                  <Td><Badge label={atMap[a.asset_type] ?? a.asset_type} color="bg-violet-50 text-violet-600" /></Td>
                  <Td className="text-slate-400">{a.industry_id ? (indMap[a.industry_id] ?? `#${a.industry_id}`) : "—"}</Td>
                  <Td>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      {(rolesMap[a.id] ?? []).length > 0
                        ? <>
                            {(rolesMap[a.id]).slice(0, 3).map(r => (
                              <span key={r.role_id}
                                className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium"
                                style={r.color ? { backgroundColor: r.color + "22", color: r.color } : undefined}>
                                {r.role_name}
                              </span>
                            ))}
                            {(rolesMap[a.id]).length > 3 && <span className="text-[10px] text-slate-400">+{(rolesMap[a.id]).length - 3}</span>}
                          </>
                        : <span className="text-slate-300 text-xs">—</span>
                      }
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {swingModel
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-xs font-medium text-violet-700">{swingModel.name} {swingModel.version}</span>
                      : <span className="text-xs text-slate-400">未設定</span>}
                    {swingModel && <div className={["mt-0.5 text-[10px] font-medium", swingModel.status === "active" ? "text-emerald-600" : swingModel.status === "testing" ? "text-amber-600" : "text-slate-400"].join(" ")}>{swingModel.status === "active" ? "啟用中" : swingModel.status === "testing" ? "測試中" : "停用"}</div>}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {positionModel
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-xs font-medium text-teal-700">{positionModel.name} {positionModel.version}</span>
                      : <span className="text-xs text-slate-400">未設定</span>}
                    {positionModel && <div className={["mt-0.5 text-[10px] font-medium", positionModel.status === "active" ? "text-emerald-600" : positionModel.status === "testing" ? "text-amber-600" : "text-slate-400"].join(" ")}>{positionModel.status === "active" ? "啟用中" : positionModel.status === "testing" ? "測試中" : "停用"}</div>}
                  </Td>
                  <Td>{modelCount > 0 ? <span className="inline-flex items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">{modelCount}</span> : <span className="text-xs text-slate-400">0</span>}</Td>
                  <Td>
                    <div>{a.currency}</div>
                    {a.api_config_id && <div className="text-xs text-indigo-500 mt-0.5">{apiConfigs.find(c => c.id === a.api_config_id)?.name ?? `API#${a.api_config_id}`}</div>}
                  </Td>
                  <Td><Badge label={a.is_active ? "啟用" : "停用"} color={a.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"} /></Td>
                  <Td><div className="flex items-center gap-1.5 whitespace-nowrap">
                    <button className="rounded-md border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50" onClick={() => setExpandedId(expandedId === a.id ? null : a.id)} type="button">{expandedId === a.id ? "收起 ▲" : "角色 ▼"}</button>
                    <button className="rounded-md border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50" onClick={() => setModuleConfigAsset(a)} type="button">模組設定</button>
                    <button className={["rounded-md border px-2 py-1 text-xs font-medium transition-colors", a.crawler_enabled ? "border-sky-200 text-sky-600 bg-sky-50 hover:bg-sky-100" : "border-slate-200 text-slate-500 hover:bg-slate-50"].join(" ")} onClick={() => setCrawlerAsset(a)} type="button">{a.crawler_enabled ? "爬蟲 ●" : "爬蟲"}</button>
                    <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => setEditAsset(a)} type="button">編輯</button>
                    <button className={btnDanger} onClick={async () => { if (!confirm(`永久刪除「${a.symbol} ${a.name}」？\n此操作無法復原，所有相關設定將一併移除。`)) return; try { await deleteAdminAsset(a.id); load(); } catch (e) { alert(extractErr(e)); } }} type="button">刪除</button>
                  </div></Td>
                </tr>
                {expandedId === a.id && (
                  <tr><td colSpan={12}>
                    <AssetRoleLinkPanel assetId={a.id} allRoles={allRoles} onSaved={() => getAssetRoleLinks(a.id).then(roles => setRolesMap(prev => ({ ...prev, [a.id]: roles }))).catch(() => {})} />
                    {a.description && (
                      <div className="px-4 pb-3 bg-slate-50/80 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">備注描述</p>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{a.description}</p>
                      </div>
                    )}
                  </td></tr>
                )}
              </Fragment>
            ); })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>共 {data.total} 筆，第 {page + 1} 頁</span>
        <div className="flex gap-2">
          <button className={btnSecondary} disabled={page === 0} onClick={() => setPage(p => p - 1)} type="button">上一頁</button>
          <button className={btnSecondary} disabled={(page + 1) * limit >= data.total} onClick={() => setPage(p => p + 1)} type="button">下一頁</button>
        </div>
      </div>
      {moduleConfigAsset && (
        <AssetModuleConfigModal
          asset={moduleConfigAsset}
          allIndicators={allIndicators}
          allModels={allModels}
          onClose={() => setModuleConfigAsset(null)}
          onSaved={(updated) => { setData(prev => ({ ...prev, items: prev.items.map(a => a.id === updated.id ? updated : a) })); setModuleConfigAsset(updated); }}
        />
      )}
      {crawlerAsset && (
        <AssetCrawlerModal
          asset={crawlerAsset}
          allIndicators={allIndicators}
          apiConfigs={apiConfigs}
          onClose={() => setCrawlerAsset(null)}
          onSaved={(updated) => { setData(prev => ({ ...prev, items: prev.items.map(a => a.id === updated.id ? updated : a) })); setCrawlerAsset(updated); }}
        />
      )}
      {addOpen && <AssetModal title="新增標的" initial={emptyAssetForm()} industries={industries} markets={markets} assetTypes={assetTypes} apiConfigs={apiConfigs} onClose={() => setAddOpen(false)} onSave={async form => { await createAdminAsset({ symbol: form.symbol, name: form.name, market: form.market, asset_type: form.asset_type, currency: form.currency, industry_id: form.industry_id ? Number(form.industry_id) : undefined, api_config_id: form.api_config_id ? Number(form.api_config_id) : null, api_code: form.api_code || null, description: form.description || null, update_frequency: form.update_frequency || null, in_swing_pool: form.in_swing_pool, in_newsletter: form.in_newsletter, needs_backtest: form.needs_backtest, is_penny_stock: form.is_penny_stock }); setAddOpen(false); load(); }} />}
      {editAsset && <AssetModal title={`編輯 ${editAsset.symbol}`} initial={{ symbol: editAsset.symbol, name: editAsset.name, market: editAsset.market, asset_type: editAsset.asset_type, currency: editAsset.currency, industry_id: editAsset.industry_id ? String(editAsset.industry_id) : "", api_config_id: editAsset.api_config_id ? String(editAsset.api_config_id) : "", api_code: editAsset.api_code ?? "", description: editAsset.description ?? "", update_frequency: editAsset.update_frequency ?? "", in_swing_pool: editAsset.in_swing_pool, in_newsletter: editAsset.in_newsletter, needs_backtest: editAsset.needs_backtest, is_penny_stock: editAsset.is_penny_stock, is_active: editAsset.is_active }} industries={industries} markets={markets} assetTypes={assetTypes} apiConfigs={apiConfigs} onClose={() => setEditAsset(null)} onSave={async form => { await updateAdminAsset(editAsset.id, { name: form.name, market: form.market, asset_type: form.asset_type, currency: form.currency, industry_id: form.industry_id ? Number(form.industry_id) : null, api_config_id: form.api_config_id ? Number(form.api_config_id) : null, api_code: form.api_code || null, description: form.description || null, update_frequency: form.update_frequency || null, in_swing_pool: form.in_swing_pool, in_newsletter: form.in_newsletter, needs_backtest: form.needs_backtest, is_penny_stock: form.is_penny_stock, is_active: form.is_active }); setEditAsset(null); load(); }} />}
      {bulkOpen && (
        <Modal title="批次匯入股票" onClose={() => setBulkOpen(false)}>
          <div className="flex flex-col gap-4">
            <p className="text-xs text-slate-500">貼上 JSON 陣列，每筆需包含 symbol / name / market / asset_type / currency。</p>
            <textarea className={`${inputCls} font-mono text-xs`} rows={10} value={bulkText} onChange={e => setBulkText(e.target.value)} />
            {bulkErr ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{bulkErr}</p> : null}
            {bulkResult ? <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">✅ 新增 {bulkResult.created} 筆，略過 {bulkResult.skipped} 筆重複。</div> : null}
            <div className="flex justify-end gap-2">
              <button className={btnSecondary} onClick={() => setBulkOpen(false)} type="button">關閉</button>
              <button className={btnPrimary} disabled={bulkLoading} onClick={async () => {
                setBulkErr(""); setBulkResult(null);
                let parsed: unknown;
                try { parsed = JSON.parse(bulkText); } catch { setBulkErr("JSON 格式錯誤"); return; }
                if (!Array.isArray(parsed)) { setBulkErr("請輸入陣列格式"); return; }
                setBulkLoading(true);
                try { const r = await bulkImportAssets(parsed as Parameters<typeof bulkImportAssets>[0]); setBulkResult(r); load(); }
                catch (e) { setBulkErr(extractErr(e)); } finally { setBulkLoading(false); }
              }} type="button">{bulkLoading ? "匯入中…" : "開始匯入"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Asset Types Management (資產管理)
// ─────────────────────────────────────────────────────────────────────────────

function AssetTypesTab({ onReload }: { onReload: (rows: AssetTypeConfig[]) => void }) {
  const [rows, setRows] = useState<AssetTypeConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", description: "", display_order: 0 });
  const [editRow, setEditRow] = useState<AssetTypeConfig | null>(null);
  const [editForm, setEditForm] = useState<Partial<{ name: string; description: string; is_active: boolean; display_order: number }>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await listAssetTypeConfigs(); setRows(r); onReload(r); } catch { /* silently fail */ } finally { setLoading(false); }
  }, [onReload]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-slate-100 bg-indigo-50/40 p-4 text-sm text-slate-600">
        <strong>資產管理</strong> — 定義資產類別（如股票、加密貨幣、保險等）。這些類別會同步到「標的管理」的資產類型下拉選單。
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">新增資產類別</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <input className={inputCls} placeholder="代碼 如 insurance" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} />
          <input className={inputCls} placeholder="名稱 如 保險" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <input type="number" className={inputCls} placeholder="排序" value={form.display_order} onChange={e => setForm(p => ({ ...p, display_order: Number(e.target.value) }))} min={0} step={1} />
          <button className={btnPrimary} disabled={saving} onClick={async () => {
            if (!form.code || !form.name) { setErr("代碼與名稱為必填"); return; }
            setSaving(true); setErr("");
            try { await createAssetTypeConfig({ code: form.code, name: form.name, description: form.description || null, display_order: form.display_order }); setForm({ code: "", name: "", description: "", display_order: 0 }); load(); }
            catch (e) { setErr(extractErr(e)); } finally { setSaving(false); }
          }} type="button">新增</button>
        </div>
        <input className={`${inputCls} mt-2`} placeholder="描述（選填）" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        {err ? <p className="mt-2 text-sm text-red-500">{err}</p> : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-slate-50"><tr><Th>代碼</Th><Th>名稱</Th><Th>描述</Th><Th>排序</Th><Th>狀態</Th><Th>操作</Th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">載入中…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">尚無資產類別</td></tr>
              : rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-50/60">
                {editRow?.id === row.id ? (
                  <>
                    <Td><span className="font-mono text-slate-500">{row.code}</span></Td>
                    <Td><input className={inputCls} defaultValue={row.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></Td>
                    <Td><input className={inputCls} defaultValue={row.description ?? ""} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></Td>
                    <Td><input type="number" className={`${inputCls} w-16`} defaultValue={row.display_order} onChange={e => setEditForm(p => ({ ...p, display_order: Number(e.target.value) }))} /></Td>
                    <Td><label className="flex items-center gap-1.5 cursor-pointer text-sm"><input type="checkbox" defaultChecked={row.is_active} onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked }))} />啟用</label></Td>
                    <Td><div className="flex gap-1.5"><button className={btnPrimary} disabled={saving} onClick={async () => { setSaving(true); try { await updateAssetTypeConfig(editRow!.id, editForm); setEditRow(null); load(); } catch (e) { setErr(extractErr(e)); } finally { setSaving(false); } }} type="button">儲存</button><button className={btnSecondary} onClick={() => setEditRow(null)} type="button">取消</button></div></Td>
                  </>
                ) : (
                  <>
                    <Td><span className="font-mono font-semibold text-slate-900">{row.code}</span></Td>
                    <Td><span className="font-medium">{row.name}</span></Td>
                    <Td className="text-slate-400">{row.description ?? "—"}</Td>
                    <Td>{row.display_order}</Td>
                    <Td><Badge label={row.is_active ? "啟用" : "停用"} color={row.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"} /></Td>
                    <Td><div className="flex gap-1.5">
                      <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => { setEditRow(row); setEditForm({}); }} type="button">編輯</button>
                      <button className={btnDanger} onClick={async () => { if (!confirm(`刪除類別「${row.name}」？`)) return; try { await deleteAssetTypeConfig(row.id); load(); } catch (e) { alert(extractErr(e)); } }} type="button">刪除</button>
                    </div></Td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {err && rows.find(r => r.id === editRow?.id) && <p className="text-sm text-red-500">{err}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Indicators Management (sub-tabbed)
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_OPTS = [
  { value: "technical", label: "技術面", color: "bg-blue-50 text-blue-600" },
  { value: "fundamental", label: "基本面", color: "bg-emerald-50 text-emerald-600" },
  { value: "chips", label: "籌碼面", color: "bg-violet-50 text-violet-600" },
  { value: "news", label: "消息面", color: "bg-amber-50 text-amber-600" },
  { value: "situation", label: "情況", color: "bg-cyan-50 text-cyan-600" },
  { value: "operation", label: "操作", color: "bg-orange-50 text-orange-600" },
  { value: "score", label: "分數指標", color: "bg-rose-50 text-rose-600" },
];

type IndSubTab = "market" | "fundamental" | "technical" | "chips" | "news" | "situation" | "operation" | "score";
const IND_SUB_TABS: { key: IndSubTab; label: string; category: string | null }[] = [
  { key: "market", label: "市場指標", category: null },
  { key: "fundamental", label: "基本面指標", category: "fundamental" },
  { key: "technical", label: "技術面指標", category: "technical" },
  { key: "chips", label: "籌碼面指標", category: "chips" },
  { key: "news", label: "消息面指標", category: "news" },
  { key: "situation", label: "情況指標", category: "situation" },
  { key: "operation", label: "操作指標", category: "operation" },
  { key: "score", label: "分數指標", category: "score" },
];

function IndicatorsTab() {
  const [indSubTab, setIndSubTab] = useState<IndSubTab>("market");
  const [rows, setRows] = useState<MarketIndicatorConfig[]>([]);
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState<MarketIndicatorConfig | null>(null);
  const [editForm, setEditForm] = useState<Partial<MarketIndicatorConfig>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [expandedFormula, setExpandedFormula] = useState<number | null>(null);
  const [addForm, setAddForm] = useState({ field_key: "", display_name: "", unit: "%", description: "", formula: "", display_order: 0, indicator_category: "" });
  const [addSaving, setAddSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const [r, apis] = await Promise.all([listIndicatorConfigs(), listApiConfigs()]); setRows(r); setApiConfigs(apis); } catch { /* silently fail */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const apiMap = useMemo(() => { const m: Record<number, string> = {}; apiConfigs.forEach(a => { m[a.id] = a.name; }); return m; }, [apiConfigs]);

  function getApiLabel(row: MarketIndicatorConfig) {
    if (row.api_source) return row.api_source;
    if (row.api_config_id && apiMap[row.api_config_id]) return apiMap[row.api_config_id];
    return "—";
  }

  function getCategoryBadge(cat: string | null | undefined) {
    const opt = CATEGORY_OPTS.find(o => o.value === cat);
    return opt ? <Badge label={opt.label} color={opt.color} /> : <span className="text-xs text-slate-400">未分類</span>;
  }

  const curTabInfo = IND_SUB_TABS.find(t => t.key === indSubTab)!;
  const filteredRows = curTabInfo.category === null ? rows : rows.filter(r => r.indicator_category === curTabInfo.category);
  const defaultCategory = curTabInfo.category ?? "";

  useEffect(() => {
    setAddForm(p => ({ ...p, indicator_category: defaultCategory }));
  }, [indSubTab, defaultCategory]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 flex-wrap rounded-xl bg-white border border-slate-100 p-1 shadow-sm">
        {IND_SUB_TABS.map(t => (
          <button key={t.key} type="button" onClick={() => setIndSubTab(t.key)}
            className={["rounded-lg px-3 py-2 text-sm font-medium transition-colors", indSubTab === t.key ? "bg-indigo-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"].join(" ")}>
            {t.label}
            <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-semibold tabular-nums">
              {t.category === null ? rows.length : rows.filter(r => r.indicator_category === t.category).length}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">新增{curTabInfo.label}</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <input className={inputCls} placeholder="欄位鍵（唯一）如 rsi" value={addForm.field_key} onChange={e => setAddForm(p => ({ ...p, field_key: e.target.value }))} />
          <input className={inputCls} placeholder="顯示名稱" value={addForm.display_name} onChange={e => setAddForm(p => ({ ...p, display_name: e.target.value }))} />
          <input className={inputCls} placeholder="單位 如 %" value={addForm.unit} onChange={e => setAddForm(p => ({ ...p, unit: e.target.value }))} />
          <select className={inputCls} value={addForm.indicator_category} onChange={e => setAddForm(p => ({ ...p, indicator_category: e.target.value }))}>
            <option value="">— 分類（選填）—</option>
            {CATEGORY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 mt-2">
          <input className={inputCls} placeholder="說明（選填）" value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} />
          <input className={inputCls} placeholder="計算公式（選填）" value={addForm.formula} onChange={e => setAddForm(p => ({ ...p, formula: e.target.value }))} />
          <button className={btnPrimary} disabled={addSaving} onClick={async () => {
            if (!addForm.field_key || !addForm.display_name) { setErr("欄位鍵與顯示名稱為必填"); return; }
            setAddSaving(true); setErr("");
            try { await createIndicatorConfig({ field_key: addForm.field_key, display_name: addForm.display_name, unit: addForm.unit, description: addForm.description || null, formula: addForm.formula || null, display_order: addForm.display_order, is_active: true, indicator_category: addForm.indicator_category || null }); setAddForm({ field_key: "", display_name: "", unit: "%", description: "", formula: "", display_order: 0, indicator_category: defaultCategory }); load(); }
            catch (e) { setErr(extractErr(e)); } finally { setAddSaving(false); }
          }} type="button">新增</button>
        </div>
        {err ? <p className="mt-2 text-sm text-red-500">{err}</p> : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-slate-50"><tr><Th>欄位鍵</Th><Th>顯示名稱</Th><Th>分類</Th><Th>單位</Th><Th>排序</Th><Th>API來源</Th><Th>說明/公式</Th><Th>啟用</Th><Th>操作</Th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={9} className="py-10 text-center text-sm text-slate-400">載入中…</td></tr>
              : filteredRows.length === 0 ? <tr><td colSpan={9} className="py-10 text-center text-sm text-slate-400">此分類尚無指標</td></tr>
              : filteredRows.map(row => (
              <tr key={row.id} className="hover:bg-slate-50/60">
                {editRow?.id === row.id ? (
                  <>
                    <Td><span className="font-mono text-xs text-slate-400">{row.field_key}</span></Td>
                    <Td><input className={inputCls} defaultValue={row.display_name} onChange={e => setEditForm(p => ({ ...p, display_name: e.target.value }))} /></Td>
                    <Td>
                      <select className={`${inputCls} w-24`} defaultValue={row.indicator_category ?? ""} onChange={e => setEditForm(p => ({ ...p, indicator_category: e.target.value || null }))}>
                        <option value="">— 未分類 —</option>
                        {CATEGORY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </Td>
                    <Td><input className={`${inputCls} w-16`} defaultValue={row.unit} onChange={e => setEditForm(p => ({ ...p, unit: e.target.value }))} /></Td>
                    <Td><input type="number" className={`${inputCls} w-16`} defaultValue={row.display_order} onChange={e => setEditForm(p => ({ ...p, display_order: Number(e.target.value) }))} /></Td>
                    <Td>
                      <div className="flex flex-col gap-1.5">
                        <select className={inputCls} defaultValue={String(row.api_config_id ?? "")} onChange={e => setEditForm(p => ({ ...p, api_config_id: e.target.value ? Number(e.target.value) : null }))}>
                          <option value="">— 不指定 —</option>{apiConfigs.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                        </select>
                        <input className={inputCls} defaultValue={row.api_source ?? ""} placeholder="自訂 API 名稱" onChange={e => setEditForm(p => ({ ...p, api_source: e.target.value || null }))} />
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-col gap-1">
                        <input className={inputCls} defaultValue={row.description ?? ""} placeholder="說明" onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                        <textarea className={`${inputCls} text-xs`} rows={2} defaultValue={row.formula ?? ""} placeholder="計算公式" onChange={e => setEditForm(p => ({ ...p, formula: e.target.value }))} />
                      </div>
                    </Td>
                    <Td><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked={row.is_active} onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked }))} />啟用</label></Td>
                    <Td><div className="flex gap-1.5"><button className={btnPrimary} disabled={saving} onClick={async () => { setSaving(true); setErr(""); try { await updateIndicatorConfig(editRow!.id, editForm); setEditRow(null); load(); } catch (e) { setErr(extractErr(e)); } finally { setSaving(false); } }} type="button">儲存</button><button className={btnSecondary} onClick={() => setEditRow(null)} type="button">取消</button></div></Td>
                  </>
                ) : (
                  <>
                    <Td><span className="font-mono text-xs text-slate-500">{row.field_key}</span></Td>
                    <Td><span className="font-medium text-slate-900">{row.display_name}</span></Td>
                    <Td>{getCategoryBadge(row.indicator_category)}</Td>
                    <Td>{row.unit}</Td>
                    <Td>{row.display_order}</Td>
                    <Td>{getApiLabel(row) !== "—" ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">🔗 {getApiLabel(row)}</span> : <span className="text-xs text-slate-400">未設定</span>}</Td>
                    <Td><button className="text-xs text-indigo-500 hover:underline" onClick={() => setExpandedFormula(expandedFormula === row.id ? null : row.id)} type="button">{expandedFormula === row.id ? "收起" : "查看"}</button>
                      {expandedFormula === row.id && <div className="mt-1.5 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{row.description && <p className="mb-1">{row.description}</p>}{row.formula ? <p className="font-mono text-indigo-600 whitespace-pre-wrap">{row.formula}</p> : <p className="text-slate-400">尚無公式</p>}</div>}
                    </Td>
                    <Td><Badge label={row.is_active ? "啟用" : "停用"} color={row.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"} /></Td>
                    <Td><button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => { setEditRow(row); setEditForm({}); }} type="button">編輯</button></Td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Events Management
// ─────────────────────────────────────────────────────────────────────────────

type EventType = "news" | "macro" | "industry" | "company" | "earnings";
const EVENT_TABS: { key: EventType; label: string; color: string; desc: string }[] = [
  { key: "news", label: "新聞事件", color: "bg-blue-50 text-blue-700 border-blue-200", desc: "市場相關新聞與突發事件" },
  { key: "macro", label: "總經事件", color: "bg-violet-50 text-violet-700 border-violet-200", desc: "宏觀經濟數據、政策發布、Fed 決議等" },
  { key: "industry", label: "產業事件", color: "bg-emerald-50 text-emerald-700 border-emerald-200", desc: "產業政策、供應鏈變動、技術突破等" },
  { key: "company", label: "公司事件", color: "bg-amber-50 text-amber-700 border-amber-200", desc: "法說會、董事會決議、重大訊息等" },
  { key: "earnings", label: "財報事件", color: "bg-rose-50 text-rose-700 border-rose-200", desc: "季報、年報公佈與財務數據異動" },
];

type EventItem = { id: number; title: string; event_date: string; description: string; impact: "high" | "medium" | "low"; source: string };

function EventsTab() {
  const [evtTab, setEvtTab] = useState<EventType>("news");
  const [events, setEvents] = useState<Record<EventType, EventItem[]>>({ news: [], macro: [], industry: [], company: [], earnings: [] });
  const [addForm, setAddForm] = useState({ title: "", event_date: "", description: "", impact: "medium" as "high" | "medium" | "low", source: "" });
  const [nextId, setNextId] = useState(1);
  const [err, setErr] = useState("");

  const curEvents = events[evtTab];
  const curTabInfo = EVENT_TABS.find(t => t.key === evtTab)!;

  const IMPACT_OPTS = [
    { value: "high", label: "高影響", color: "bg-red-50 text-red-600 border-red-200" },
    { value: "medium", label: "中影響", color: "bg-amber-50 text-amber-600 border-amber-200" },
    { value: "low", label: "低影響", color: "bg-slate-100 text-slate-500 border-slate-200" },
  ];

  function addEvent() {
    if (!addForm.title || !addForm.event_date) { setErr("標題與日期為必填"); return; }
    const item: EventItem = { id: nextId, title: addForm.title, event_date: addForm.event_date, description: addForm.description, impact: addForm.impact, source: addForm.source };
    setEvents(prev => ({ ...prev, [evtTab]: [item, ...prev[evtTab]] }));
    setNextId(n => n + 1);
    setAddForm({ title: "", event_date: "", description: "", impact: "medium", source: "" });
    setErr("");
  }

  function deleteEvent(id: number) {
    setEvents(prev => ({ ...prev, [evtTab]: prev[evtTab].filter(e => e.id !== id) }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 flex-wrap rounded-xl bg-white border border-slate-100 p-1 shadow-sm">
        {EVENT_TABS.map(t => (
          <button key={t.key} type="button" onClick={() => { setEvtTab(t.key); setErr(""); }}
            className={["rounded-lg px-3 py-2 text-sm font-medium transition-colors", evtTab === t.key ? "bg-indigo-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"].join(" ")}>
            {t.label}
            {events[t.key].length > 0 && <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-semibold tabular-nums">{events[t.key].length}</span>}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">新增{curTabInfo.label}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{curTabInfo.desc}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <input className={`${inputCls} sm:col-span-2`} placeholder="事件標題" value={addForm.title} onChange={e => setAddForm(p => ({ ...p, title: e.target.value }))} />
          <input className={inputCls} type="date" value={addForm.event_date} onChange={e => setAddForm(p => ({ ...p, event_date: e.target.value }))} />
          <select className={inputCls} value={addForm.impact} onChange={e => setAddForm(p => ({ ...p, impact: e.target.value as "high" | "medium" | "low" }))}>
            <option value="high">高影響</option>
            <option value="medium">中影響</option>
            <option value="low">低影響</option>
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 mt-2">
          <input className={inputCls} placeholder="來源（選填）" value={addForm.source} onChange={e => setAddForm(p => ({ ...p, source: e.target.value }))} />
          <input className={`${inputCls} sm:col-span-1`} placeholder="說明（選填）" value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} />
          <button className={btnPrimary} type="button" onClick={addEvent}>新增事件</button>
        </div>
        {err ? <p className="mt-2 text-sm text-red-500">{err}</p> : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-slate-50"><tr><Th>日期</Th><Th>標題</Th><Th>影響程度</Th><Th>來源</Th><Th>說明</Th><Th>操作</Th></tr></thead>
          <tbody>
            {curEvents.length === 0
              ? <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">尚無{curTabInfo.label}記錄</td></tr>
              : curEvents.map(evt => {
                const impOpt = IMPACT_OPTS.find(o => o.value === evt.impact) ?? IMPACT_OPTS[1];
                return (
                  <tr key={evt.id} className="hover:bg-slate-50/60">
                    <Td><span className="font-mono text-xs text-slate-500">{evt.event_date}</span></Td>
                    <Td><span className="font-medium text-slate-800">{evt.title}</span></Td>
                    <Td><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${impOpt.color}`}>{impOpt.label}</span></Td>
                    <Td>{evt.source || <span className="text-xs text-slate-400">—</span>}</Td>
                    <Td className="max-w-[200px] truncate text-xs text-slate-500">{evt.description || "—"}</Td>
                    <Td><button className={btnDanger} type="button" onClick={() => deleteEvent(evt.id)}>刪除</button></Td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset Role Link Panel (used inside StocksTab expand)
// ─────────────────────────────────────────────────────────────────────────────

function AssetRoleLinkPanel({ assetId, allRoles, onSaved }: { assetId: number; allRoles: AssetRole[]; onSaved?: () => void }) {
  const [linked, setLinked] = useState<AssetRoleLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { getAssetRoleLinks(assetId).then(r => { setLinked(r); setLoading(false); }).catch(() => setLoading(false)); }, [assetId]);
  const linkedIds = useMemo(() => new Set(linked.map(l => l.role_id)), [linked]);
  async function toggle(role: AssetRole) {
    setSaving(true);
    const newIds = linkedIds.has(role.id) ? [...linkedIds].filter(id => id !== role.id) : [...linkedIds, role.id];
    try { const res = await setAssetRoleLinks(assetId, newIds); setLinked(res); onSaved?.(); } finally { setSaving(false); }
  }
  if (loading) return <p className="text-xs text-slate-400 p-4">載入中…</p>;
  return (
    <div className="p-4 bg-violet-50/40 border-b border-slate-100">
      <p className="mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">標的角色（複選）</p>
      <div className="flex flex-wrap gap-2">
        {allRoles.filter(r => r.is_active).map(role => (
          <button key={role.id} type="button" disabled={saving} onClick={() => toggle(role)}
            className={["inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              linkedIds.has(role.id) ? "border-violet-300 bg-violet-100 text-violet-700" : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50/50"
            ].join(" ")}
            style={linkedIds.has(role.id) && role.color ? { borderColor: role.color + "66", backgroundColor: role.color + "22", color: role.color } : {}}>
            {linkedIds.has(role.id) ? "✓ " : ""}{role.name}
          </button>
        ))}
        {allRoles.filter(r => r.is_active).length === 0 && <p className="text-xs text-slate-400">請先至「標的角色管理」新增角色</p>}
      </div>
      {linked.length > 0 && <p className="mt-2 text-xs text-slate-400">已關聯：{linked.map(l => l.role_name).join("、")}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Asset Role Management (標的角色管理)
// ─────────────────────────────────────────────────────────────────────────────

const ASSET_TYPE_OPTS = ["stock", "etf", "fund", "index"];
const TYPE_LABELS: Record<string, string> = { stock: "股票", etf: "ETF", fund: "基金", index: "指數" };

function AssetRoleTab() {
  const [rows, setRows] = useState<AssetRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState<AssetRole | null>(null);
  const [editForm, setEditForm] = useState<Partial<AssetRole>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [addForm, setAddForm] = useState({ name: "", code: "", applicable_types: [] as string[], description: "", color: "#6366f1", display_order: 0 });
  const [addSaving, setAddSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); try { setRows(await listAssetRoles()); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function toggleAddType(t: string) {
    setAddForm(p => ({ ...p, applicable_types: p.applicable_types.includes(t) ? p.applicable_types.filter(x => x !== t) : [...p.applicable_types, t] }));
  }
  function toggleEditType(t: string) {
    setEditForm(p => {
      const cur = (p.applicable_types ?? []) as string[];
      return { ...p, applicable_types: cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t] };
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-slate-100 bg-violet-50/40 p-4 text-sm text-slate-600">
        <strong>標的角色管理</strong> — 定義可套用在標的上的角色標籤（如龍頭股、產業ETF等）。角色可設定適用標的類型。
      </div>

      {/* Add form */}
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">新增角色</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <input className={inputCls} placeholder="角色名稱 如 龍頭股" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} />
          <input className={inputCls} placeholder="代碼 如 leader_stock" value={addForm.code} onChange={e => setAddForm(p => ({ ...p, code: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} />
          <div className="flex items-center gap-2">
            <input type="color" className="h-9 w-12 rounded border border-slate-200 cursor-pointer" value={addForm.color} onChange={e => setAddForm(p => ({ ...p, color: e.target.value }))} />
            <input className={inputCls} placeholder="#6366f1" value={addForm.color} onChange={e => setAddForm(p => ({ ...p, color: e.target.value }))} />
          </div>
          <button className={btnPrimary} disabled={addSaving} onClick={async () => {
            if (!addForm.name || !addForm.code) { setErr("名稱與代碼為必填"); return; }
            setAddSaving(true); setErr("");
            try { await createAssetRole({ name: addForm.name, code: addForm.code, applicable_types: addForm.applicable_types.length > 0 ? addForm.applicable_types : null, description: addForm.description || null, color: addForm.color || null, display_order: addForm.display_order }); setAddForm({ name: "", code: "", applicable_types: [], description: "", color: "#6366f1", display_order: 0 }); load(); }
            catch (e) { setErr(extractErr(e)); } finally { setAddSaving(false); }
          }} type="button">新增</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <p className="text-xs text-slate-500 self-center mr-1">適用類型：</p>
          {ASSET_TYPE_OPTS.map(t => (
            <label key={t} className={["flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-medium cursor-pointer transition-colors", addForm.applicable_types.includes(t) ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-indigo-200"].join(" ")}>
              <input type="checkbox" className="hidden" checked={addForm.applicable_types.includes(t)} onChange={() => toggleAddType(t)} />{TYPE_LABELS[t]}
            </label>
          ))}
        </div>
        <input className={`${inputCls} mt-2`} placeholder="說明（選填）" value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} />
        {err ? <p className="mt-2 text-sm text-red-500">{err}</p> : null}
      </div>

      {/* Role table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-slate-50"><tr><Th>顏色</Th><Th>角色名稱</Th><Th>代碼</Th><Th>適用類型</Th><Th>說明</Th><Th>排序</Th><Th>狀態</Th><Th>操作</Th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-400">載入中…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-400">尚無角色，請新增</td></tr>
              : rows.map(row => (
              <tr key={row.id} className={["hover:bg-slate-50/60", !row.is_active ? "opacity-50" : ""].join(" ")}>
                {editRow?.id === row.id ? (
                  <>
                    <Td><input type="color" className="h-8 w-10 rounded border border-slate-200 cursor-pointer" defaultValue={row.color ?? "#6366f1"} onChange={e => setEditForm(p => ({ ...p, color: e.target.value }))} /></Td>
                    <Td><input className={inputCls} defaultValue={row.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></Td>
                    <Td><span className="font-mono text-xs text-slate-400">{row.code}</span></Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {ASSET_TYPE_OPTS.map(t => {
                          const cur = (editForm.applicable_types ?? row.applicable_types ?? []) as string[];
                          return (
                            <label key={t} className={["flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium cursor-pointer border transition-colors", cur.includes(t) ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-400"].join(" ")}>
                              <input type="checkbox" className="hidden" checked={cur.includes(t)} onChange={() => toggleEditType(t)} />{TYPE_LABELS[t]}
                            </label>
                          );
                        })}
                      </div>
                    </Td>
                    <Td><input className={inputCls} defaultValue={row.description ?? ""} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></Td>
                    <Td><input type="number" className={`${inputCls} w-16`} defaultValue={row.display_order} onChange={e => setEditForm(p => ({ ...p, display_order: Number(e.target.value) }))} /></Td>
                    <Td><label className="flex items-center gap-1.5 cursor-pointer text-sm"><input type="checkbox" defaultChecked={row.is_active} onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked }))} />啟用</label></Td>
                    <Td><div className="flex gap-1.5">
                      <button className={btnPrimary} disabled={saving} onClick={async () => { setSaving(true); try { await updateAssetRole(editRow!.id, editForm); setEditRow(null); load(); } catch (e) { setErr(extractErr(e)); } finally { setSaving(false); } }} type="button">儲存</button>
                      <button className={btnSecondary} onClick={() => setEditRow(null)} type="button">取消</button>
                    </div></Td>
                  </>
                ) : (
                  <>
                    <Td><span className="inline-block h-5 w-5 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: row.color ?? "#6366f1" }} /></Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border" style={{ backgroundColor: (row.color ?? "#6366f1") + "22", borderColor: (row.color ?? "#6366f1") + "66", color: row.color ?? "#6366f1" }}>
                        {row.name}
                      </span>
                    </Td>
                    <Td><span className="font-mono text-xs text-slate-500">{row.code}</span></Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {(row.applicable_types ?? []).map(t => <span key={t} className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{TYPE_LABELS[t] ?? t}</span>)}
                        {(!row.applicable_types || row.applicable_types.length === 0) && <span className="text-xs text-slate-400">全部</span>}
                      </div>
                    </Td>
                    <Td className="text-slate-400 max-w-[140px] truncate">{row.description ?? "—"}</Td>
                    <Td>{row.display_order}</Td>
                    <Td><Badge label={row.is_active ? "啟用" : "停用"} color={row.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"} /></Td>
                    <Td><div className="flex gap-1.5">
                      <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => { setEditRow(row); setEditForm({}); }} type="button">編輯</button>
                      <button className={btnDanger} onClick={async () => { if (!confirm(`刪除角色「${row.name}」？`)) return; try { await deleteAssetRole(row.id); load(); } catch (e) { alert(extractErr(e)); } }} type="button">刪除</button>
                    </div></Td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {err && <p className="text-sm text-red-500">{err}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Analysis (分析管理)
// ─────────────────────────────────────────────────────────────────────────────

type FactorEntry = { field_key: string; display_name: string; weight: number; corr_score: number | null };

function corrColor(v: number | null) {
  if (v === null) return "text-slate-400";
  if (v >= 0.7) return "text-emerald-600 font-semibold";
  if (v >= 0.4) return "text-amber-600 font-semibold";
  return "text-red-500 font-semibold";
}

// ── Analysis sub-sections ────────────────────────────────────────────────────

// Formula categories
const FORMULA_CATEGORIES = [
  { type: "market_score", label: "市場分析", description: "計算市場整體走勢分數（MarketScore）" },
  { type: "industry_score", label: "産業分析", description: "計算産業動能分數（IndustryScore）" },
  { type: "stock_score", label: "股票分析", description: "計算個股 / ETF 評分（StockScore）" },
] as const;
type FormulaCatType = (typeof FORMULA_CATEGORIES)[number]["type"];

// ── Formula item editor (drill-down) ─────────────────────────────────────────
function FormulaItemEditor({
  formulaType, catLabel, allIndicators, latestCorrMap, markets, initialMarketCode, onBack,
}: {
  formulaType: FormulaCatType; catLabel: string;
  allIndicators: MarketIndicatorConfig[];
  latestCorrMap: Record<string, number | null>;
  markets: MarketConfig[];
  initialMarketCode?: string | null;
  onBack: () => void;
}) {
  const trackedMarkets = markets.filter(m => m.is_tracked && m.is_active);
  const isMarketScore = formulaType === "market_score";
  // Use initialMarketCode if provided, else first tracked market
  const [marketCode, setMarketCode] = useState<string | null>(
    isMarketScore
      ? (initialMarketCode ?? (trackedMarkets.length > 0 ? trackedMarkets[0].code : null))
      : null
  );

  const [rows, setRows] = useState<ScoreFormula[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ display_name: string; weight: number; is_active: boolean; is_reverse: boolean }>({ display_name: "", weight: 0, is_active: true, is_reverse: false });
  const [saving, setSaving] = useState(false);
  const [addIndId, setAddIndId] = useState("");
  const [addWeight, setAddWeight] = useState(0);
  const [addReverse, setAddReverse] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const allRows = await listScoreFormulas(formulaType, isMarketScore ? marketCode : undefined);
      // filter to just this market's rows (or global when marketCode is null)
      setRows(isMarketScore
        ? allRows.filter(r => r.market_code === marketCode)
        : allRows
      );
    } finally { setLoading(false); }
  }, [formulaType, marketCode, isMarketScore]);

  useEffect(() => { load(); }, [load]);
  // Reset editId when market tab switches
  useEffect(() => { setEditId(null); }, [marketCode]);

  const activeRows = rows.filter(r => r.is_active && r.use_in_calc);
  const totalWeight = activeRows.reduce((s, r) => s + r.weight, 0);
  const linkedKeys = new Set(rows.map(r => r.field_key));
  const availableInds = allIndicators.filter(i => !linkedKeys.has(i.field_key));

  async function handleAdd() {
    setErr("");
    const ind = allIndicators.find(i => String(i.id) === addIndId);
    if (!ind) { setErr("請選擇指標"); return; }
    setAddSaving(true);
    try {
      await createScoreFormula({
        formula_type: formulaType,
        market_code: isMarketScore ? marketCode : null,
        field_key: ind.field_key,
        display_name: ind.display_name,
        weight: addWeight,
        is_active: true,
        use_in_calc: true,
        is_reverse: addReverse,
        display_order: rows.length + 1,
      });
      setAddIndId(""); setAddWeight(0); setAddReverse(false); load();
    } catch (e) { setErr(extractErr(e)); } finally { setAddSaving(false); }
  }

  async function handleMove(idx: number, dir: -1 | 1) {
    const toIdx = idx + dir;
    if (toIdx < 0 || toIdx >= rows.length) return;
    const reordered = [...rows];
    [reordered[idx], reordered[toIdx]] = [reordered[toIdx], reordered[idx]];
    setRows(reordered);
    await Promise.all(reordered.map((r, i) => updateScoreFormula(r.id, { display_order: i + 1 }).catch(() => {})));
  }

  function openEdit(row: ScoreFormula) {
    setEditId(row.id);
    setEditForm({ display_name: row.display_name, weight: row.weight, is_active: row.is_active, is_reverse: row.is_reverse });
  }

  async function handleSaveEdit(rowId: number) {
    setSaving(true);
    try {
      await updateScoreFormula(rowId, editForm);
      setEditId(null);
      load();
    } finally { setSaving(false); }
  }

  async function handleWeightStep(row: ScoreFormula, delta: number) {
    const next = Math.max(0, Math.min(100, row.weight + delta));
    await updateScoreFormula(row.id, { weight: next });
    load();
  }

  async function handleToggleReverse(row: ScoreFormula) {
    await updateScoreFormula(row.id, { is_reverse: !row.is_reverse });
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">← 返回列表</button>
        <h3 className="text-base font-semibold text-slate-800">{catLabel} · 編輯</h3>
        <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">v1.0</span>
      </div>

      {/* Market tabs — only for market_score */}
      {isMarketScore && trackedMarkets.length > 0 && (
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-100 bg-white p-1 shadow-sm w-fit">
          {trackedMarkets.map(m => (
            <button key={m.code} type="button" onClick={() => setMarketCode(m.code)}
              className={["rounded-lg px-4 py-1.5 text-sm font-medium transition-colors", marketCode === m.code ? "bg-indigo-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"].join(" ")}>
              {m.name}（{m.code}）
            </button>
          ))}
        </div>
      )}

      {/* Formula preview */}
      {activeRows.length > 0 && (
        <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-5 py-4">
          <p className="mb-1 text-xs font-semibold text-violet-500 uppercase tracking-wide">目前公式{isMarketScore && marketCode ? ` · ${marketCode}` : ""}</p>
          <p className="text-sm font-medium text-slate-700 leading-relaxed break-all">
            {activeRows.map((r, i) => (
              <span key={r.id}>{i > 0 ? " + " : ""}{r.display_name}{r.is_reverse ? <span className="text-rose-400 text-[10px] ml-0.5">（反向）</span> : null} × {r.weight}%</span>
            ))}
            <span className="text-slate-400"> = {catLabel}</span>
          </p>
        </div>
      )}

      {/* Weight progress bar */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
          <div className={["h-full rounded-full transition-all", totalWeight > 100 ? "bg-red-400" : totalWeight >= 95 ? "bg-emerald-500" : "bg-indigo-400"].join(" ")} style={{ width: `${Math.min(totalWeight, 100)}%` }} />
        </div>
        <span className={["text-sm font-bold tabular-nums", totalWeight > 100 ? "text-red-500" : totalWeight >= 95 ? "text-emerald-600" : "text-slate-700"].join(" ")}>{totalWeight.toFixed(1)}%</span>
        {Math.abs(totalWeight - 100) > 5 && <span className="text-xs text-amber-600">⚠ 建議總和為 100%</span>}
      </div>

      {/* Add indicator */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">新增指標</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <select className={inputCls} value={addIndId} onChange={e => setAddIndId(e.target.value)}>
            <option value="">— 選擇指標 —</option>
            {availableInds.map(i => <option key={i.id} value={String(i.id)}>{i.display_name}（{i.field_key}）</option>)}
            {availableInds.length === 0 && <option disabled>所有指標已加入</option>}
          </select>
          <div className="flex items-center gap-2">
            <input type="number" className={inputCls} placeholder="加權 %" value={addWeight} onChange={e => setAddWeight(Number(e.target.value))} min={0} max={100} step={5} />
            <span className="shrink-0 text-sm text-slate-500">%</span>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={addReverse} onChange={e => setAddReverse(e.target.checked)} className="h-4 w-4 rounded accent-rose-500" />
            <span className="text-slate-600">反向計算</span>
          </label>
          <button className={btnPrimary} disabled={addSaving || !addIndId} onClick={handleAdd} type="button">+ 新增</button>
        </div>
        {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
      </div>

      {/* Indicator table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr><Th>排序</Th><Th>納入</Th><Th>指標名稱</Th><Th>欄位鍵</Th><Th>加權 (%)</Th><Th>反向</Th><Th>相關係數</Th><Th>啟用</Th><Th>操作</Th></tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={9} className="py-10 text-center text-sm text-slate-400">載入中…</td></tr>
              : rows.length === 0
                ? <tr><td colSpan={9} className="py-10 text-center text-sm text-slate-400">尚無指標，請新增</td></tr>
                : rows.map((row, idx) => {
                  const corr = latestCorrMap[row.field_key] ?? null;
                  const isEditing = editId === row.id;
                  return (
                    <tr key={row.id} className={["border-b border-slate-50 hover:bg-slate-50/60", !row.is_active ? "opacity-50" : ""].join(" ")}>
                      {/* ↑↓ move buttons */}
                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <button type="button" onClick={() => handleMove(idx, -1)} disabled={idx === 0} className="rounded px-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xs leading-none">▲</button>
                          <button type="button" onClick={() => handleMove(idx, 1)} disabled={idx === rows.length - 1} className="rounded px-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xs leading-none">▼</button>
                        </div>
                      </Td>
                      {/* use_in_calc quick toggle */}
                      <Td>
                        <input type="checkbox" checked={row.use_in_calc} className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
                          onChange={async () => { await updateScoreFormula(row.id, { use_in_calc: !row.use_in_calc }); load(); }} />
                      </Td>

                      {isEditing ? (
                        <>
                          <Td><input className={inputCls} value={editForm.display_name} onChange={e => setEditForm(p => ({ ...p, display_name: e.target.value }))} /></Td>
                          <Td><span className="font-mono text-xs text-slate-500">{row.field_key}</span></Td>
                          <Td>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => setEditForm(p => ({ ...p, weight: Math.max(0, p.weight - 5) }))} className="rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-50">−5</button>
                              <input type="number" className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm text-center focus:outline-none focus:border-indigo-400"
                                value={editForm.weight} onChange={e => setEditForm(p => ({ ...p, weight: Number(e.target.value) }))} min={0} max={100} />
                              <button type="button" onClick={() => setEditForm(p => ({ ...p, weight: Math.min(100, p.weight + 5) }))} className="rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-50">+5</button>
                            </div>
                          </Td>
                          {/* is_reverse — controlled checkbox, no defaultChecked bug */}
                          <Td>
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input type="checkbox" checked={editForm.is_reverse}
                                onChange={e => setEditForm(p => ({ ...p, is_reverse: e.target.checked }))}
                                className="h-4 w-4 rounded accent-rose-500" />
                              <span className="text-xs text-slate-600">反向</span>
                            </label>
                          </Td>
                          <Td><span className={corrColor(corr)}>{corr != null ? corr.toFixed(3) : "—"}</span></Td>
                          <Td>
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input type="checkbox" checked={editForm.is_active}
                                onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked }))} />
                              <span className="text-xs text-slate-600">啟用</span>
                            </label>
                          </Td>
                          <Td>
                            <div className="flex gap-1.5">
                              <button className={btnPrimary + " text-xs px-2 py-1"} disabled={saving} onClick={() => handleSaveEdit(row.id)} type="button">儲存</button>
                              <button className={btnSecondary + " text-xs px-2 py-1"} onClick={() => setEditId(null)} type="button">取消</button>
                              <button className={btnDanger} onClick={async () => { if (!confirm("刪除？")) return; await deleteScoreFormula(row.id); load(); }} type="button">刪</button>
                            </div>
                          </Td>
                        </>
                      ) : (
                        <>
                          <Td><span className="font-medium text-slate-900">{row.display_name}</span></Td>
                          <Td><span className="font-mono text-xs text-slate-500">{row.field_key}</span></Td>
                          {/* Inline weight stepper */}
                          <Td>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => handleWeightStep(row, -5)} className="rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-50 select-none">−5</button>
                              <span className="w-10 text-center text-sm font-semibold tabular-nums text-slate-700">{row.weight}%</span>
                              <button type="button" onClick={() => handleWeightStep(row, 5)} className="rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-50 select-none">+5</button>
                            </div>
                          </Td>
                          {/* is_reverse direct toggle */}
                          <Td>
                            <button type="button"
                              onClick={() => handleToggleReverse(row)}
                              className={["rounded-full px-2 py-0.5 text-xs font-medium transition-colors", row.is_reverse ? "bg-rose-100 text-rose-600 hover:bg-rose-200" : "bg-slate-100 text-slate-400 hover:bg-slate-200"].join(" ")}>
                              {row.is_reverse ? "反向 ✓" : "正向"}
                            </button>
                          </Td>
                          <Td><span className={corrColor(corr)}>{corr != null ? corr.toFixed(3) : "—"}</span></Td>
                          <Td><Badge label={row.is_active ? "啟用" : "停用"} color={row.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"} /></Td>
                          <Td>
                            <button className={btnSecondary + " text-xs px-2 py-1"} onClick={() => openEdit(row)} type="button">編輯名稱</button>
                          </Td>
                        </>
                      )}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Formula Management (list + drill-down) ─────────────────────────────────
function FormulaManagementSection({ allIndicators, latestCorrMap, markets }: {
  allIndicators: MarketIndicatorConfig[];
  latestCorrMap: Record<string, number | null>;
  markets: MarketConfig[];
}) {
  const trackedMarkets = markets.filter(m => m.is_active);
  const [catType, setCatType] = useState<FormulaCatType>("market_score");
  // editingType + optional market code for market_score cards
  const [editingType, setEditingType] = useState<FormulaCatType | null>(null);
  const [editingMarketCode, setEditingMarketCode] = useState<string | null>(null);
  // summaries keyed by formula_type (for non-market categories)
  const [summaries, setSummaries] = useState<Record<string, ScoreFormula[]>>({});
  // per-market summaries for market_score: { "TW": [...], "US": [...] }
  const [marketSummaries, setMarketSummaries] = useState<Record<string, ScoreFormula[]>>({});
  const [loadingSummaries, setLoadingSummaries] = useState(false);

  const loadSummaries = useCallback(() => {
    setLoadingSummaries(true);
    const nonMarketTypes = FORMULA_CATEGORIES.filter(c => c.type !== "market_score");
    const globalLoad = Promise.all(nonMarketTypes.map(c =>
      listScoreFormulas(c.type).then(rows => ({ type: c.type, rows }))
    ));
    // Load per-market formulas for market_score
    const marketLoad = Promise.all(trackedMarkets.map(m =>
      listScoreFormulas("market_score", m.code)
        .then(rows => ({ code: m.code, rows: rows.filter(r => r.market_code === m.code) }))
    ));
    Promise.all([globalLoad, marketLoad]).then(([globalResults, marketResults]) => {
      const s: Record<string, ScoreFormula[]> = {};
      globalResults.forEach(r => { s[r.type] = r.rows; });
      setSummaries(s);
      const ms: Record<string, ScoreFormula[]> = {};
      marketResults.forEach(r => { ms[r.code] = r.rows; });
      setMarketSummaries(ms);
    }).catch(() => {}).finally(() => setLoadingSummaries(false));
  }, [trackedMarkets]);

  useEffect(() => { loadSummaries(); }, [loadSummaries, editingType]);

  function openEditor(type: FormulaCatType, mc?: string | null) {
    setEditingType(type);
    setEditingMarketCode(mc ?? null);
  }

  function closeEditor() {
    setEditingType(null);
    setEditingMarketCode(null);
  }

  if (editingType) {
    const cat = FORMULA_CATEGORIES.find(c => c.type === editingType)!;
    return (
      <FormulaItemEditor
        formulaType={editingType}
        catLabel={cat.label}
        allIndicators={allIndicators}
        latestCorrMap={latestCorrMap}
        markets={markets}
        initialMarketCode={editingMarketCode}
        onBack={closeEditor}
      />
    );
  }

  // Helper: render a single formula summary card
  function FormulaCard({
    title, subtitle, rows, onEdit,
  }: { title: string; subtitle?: string; rows: ScoreFormula[]; onEdit: () => void }) {
    const activeRows = rows.filter(r => r.is_active && r.use_in_calc);
    const totalWeight = activeRows.reduce((s, r) => s + r.weight, 0);
    const weightOk = totalWeight >= 95 && totalWeight <= 105;
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="font-semibold text-slate-900 text-sm">{title}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {subtitle ? `${subtitle} · ` : ""}
                {rows.length} 個指標 · {activeRows.length} 個啟用 · v1.0
              </p>
            </div>
            <Badge
              label={weightOk ? "權重正常" : rows.length === 0 ? "尚未設定" : `⚠ ${totalWeight.toFixed(0)}%`}
              color={weightOk ? "bg-emerald-50 text-emerald-600" : rows.length === 0 ? "bg-slate-100 text-slate-400" : "bg-amber-50 text-amber-600"}
            />
          </div>
          <button className={btnPrimary} onClick={onEdit} type="button">編輯公式</button>
        </div>
        {activeRows.length > 0 ? (
          <div className="px-5 py-3 bg-violet-50/40 border-b border-slate-100">
            <p className="text-xs text-slate-600 leading-relaxed break-all">
              {activeRows.map((r, i) => (
                <span key={r.id}>
                  {i > 0 ? " + " : ""}
                  {r.display_name}
                  {r.is_reverse ? <span className="text-rose-400 text-[10px] ml-0.5">（反向）</span> : null}
                  {" × "}{r.weight}%
                </span>
              ))}
              <span className="text-slate-400"> = {title}</span>
            </p>
          </div>
        ) : (
          <div className="px-5 py-3 bg-slate-50/60">
            <p className="text-xs text-slate-400 italic">尚未設定公式 — 點擊「編輯公式」開始新增指標</p>
          </div>
        )}
        <div className="px-5 py-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={["h-full rounded-full", weightOk ? "bg-emerald-500" : totalWeight > 100 ? "bg-red-400" : "bg-amber-400"].join(" ")}
              style={{ width: `${Math.min(totalWeight, 100)}%` }}
            />
          </div>
          <span className={["text-xs font-bold tabular-nums", weightOk ? "text-emerald-600" : totalWeight > 0 ? "text-amber-600" : "text-slate-400"].join(" ")}>
            {totalWeight.toFixed(1)}%
          </span>
          {!weightOk && rows.length > 0 && <span className="text-xs text-amber-500">建議設定為 100%</span>}
        </div>
      </div>
    );
  }

  const cat = FORMULA_CATEGORIES.find(c => c.type === catType)!;

  return (
    <div className="flex flex-col gap-4">
      {/* Category tabs */}
      <div className="flex gap-1 rounded-xl bg-white border border-slate-100 p-1 shadow-sm w-fit">
        {FORMULA_CATEGORIES.map(c => (
          <button key={c.type} type="button" onClick={() => setCatType(c.type as FormulaCatType)}
            className={["rounded-lg px-4 py-1.5 text-sm font-medium transition-colors", catType === c.type ? "bg-violet-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"].join(" ")}>
            {c.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500">{cat.description}</p>

      {loadingSummaries ? (
        <div className="py-10 text-center text-sm text-slate-400">載入中…</div>
      ) : catType === "market_score" ? (
        // Per-market cards
        <div className="flex flex-col gap-3">
          {trackedMarkets.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              尚未設定追蹤市場。請先至「市場管理」啟用並追蹤市場，才會在此顯示對應的市場公式卡片。
            </div>
          ) : trackedMarkets.map(m => (
            <FormulaCard
              key={m.code}
              title={m.name}
              subtitle={m.code}
              rows={marketSummaries[m.code] ?? []}
              onEdit={() => openEditor("market_score", m.code)}
            />
          ))}
        </div>
      ) : (
        // Single global card for industry_score / stock_score
        <FormulaCard
          title={cat.label}
          rows={summaries[catType] ?? []}
          onEdit={() => openEditor(catType)}
        />
      )}
    </div>
  );
}

// ── Model Backtest (mock data) ─────────────────────────────────────────────
type BacktestMetrics = { win_rate: number; avg_return: number; max_drawdown: number; expected_value: number; trade_count: number; assets: string[] };
type MockModel = { id: string; name: string; versions: string[] };

const MOCK_MODELS: MockModel[] = [
  { id: "tech_growth", name: "科技成長模型", versions: ["v2.1", "v2.0", "v1.5"] },
  { id: "semiconductor", name: "半導體模型", versions: ["v1.3", "v1.2"] },
  { id: "etf_swing", name: "ETF波段模型", versions: ["v3.0", "v2.5", "v2.0"] },
];

const MOCK_BACKTEST: Record<string, Record<string, Record<string, BacktestMetrics>>> = {
  tech_growth: {
    "v2.1": {
      "30d": { win_rate: 68.5, avg_return: 4.2, max_drawdown: -8.3, expected_value: 2.1, trade_count: 12, assets: ["NVDA", "2330", "QQQ", "0050"] },
      "90d": { win_rate: 63.2, avg_return: 5.8, max_drawdown: -12.1, expected_value: 2.8, trade_count: 34, assets: ["NVDA", "2330", "QQQ", "0050"] },
      "180d": { win_rate: 61.5, avg_return: 7.3, max_drawdown: -14.5, expected_value: 3.2, trade_count: 68, assets: ["NVDA", "2330", "QQQ", "0050"] },
      "365d": { win_rate: 65.8, avg_return: 9.1, max_drawdown: -18.2, expected_value: 4.5, trade_count: 126, assets: ["NVDA", "2330", "QQQ", "0050"] },
    },
    "v2.0": {
      "30d": { win_rate: 62.1, avg_return: 3.1, max_drawdown: -9.2, expected_value: 1.5, trade_count: 11, assets: ["NVDA", "2330", "QQQ"] },
      "90d": { win_rate: 58.4, avg_return: 4.2, max_drawdown: -13.5, expected_value: 1.9, trade_count: 29, assets: ["NVDA", "2330", "QQQ"] },
    },
    "v1.5": {
      "90d": { win_rate: 55.0, avg_return: 2.8, max_drawdown: -15.1, expected_value: 0.8, trade_count: 25, assets: ["NVDA", "2330"] },
    },
  },
  semiconductor: {
    "v1.3": {
      "30d": { win_rate: 72.2, avg_return: 5.8, max_drawdown: -7.2, expected_value: 3.6, trade_count: 9, assets: ["2330", "2454", "3711", "SMH"] },
      "90d": { win_rate: 70.5, avg_return: 11.3, max_drawdown: -10.4, expected_value: 5.8, trade_count: 28, assets: ["2330", "2454", "3711", "SMH"] },
      "180d": { win_rate: 68.8, avg_return: 14.2, max_drawdown: -13.8, expected_value: 6.9, trade_count: 55, assets: ["2330", "2454", "3711", "SMH"] },
      "365d": { win_rate: 71.4, avg_return: 22.5, max_drawdown: -16.3, expected_value: 9.2, trade_count: 98, assets: ["2330", "2454", "3711", "SMH"] },
    },
    "v1.2": {
      "90d": { win_rate: 65.3, avg_return: 8.9, max_drawdown: -12.0, expected_value: 3.9, trade_count: 24, assets: ["2330", "2454", "SMH"] },
    },
  },
  etf_swing: {
    "v3.0": {
      "30d": { win_rate: 60.0, avg_return: 2.8, max_drawdown: -5.1, expected_value: 1.1, trade_count: 5, assets: ["0050", "0056", "QQQ", "SPY"] },
      "90d": { win_rate: 58.3, avg_return: 5.2, max_drawdown: -7.4, expected_value: 1.8, trade_count: 18, assets: ["0050", "0056", "QQQ", "SPY"] },
      "180d": { win_rate: 61.5, avg_return: 7.8, max_drawdown: -9.1, expected_value: 2.9, trade_count: 39, assets: ["0050", "0056", "QQQ", "SPY"] },
      "365d": { win_rate: 63.2, avg_return: 11.4, max_drawdown: -11.8, expected_value: 3.8, trade_count: 74, assets: ["0050", "0056", "QQQ", "SPY"] },
    },
    "v2.5": {
      "90d": { win_rate: 55.0, avg_return: 3.9, max_drawdown: -8.9, expected_value: 1.1, trade_count: 16, assets: ["0050", "QQQ", "SPY"] },
    },
    "v2.0": {
      "90d": { win_rate: 51.2, avg_return: 2.1, max_drawdown: -10.3, expected_value: 0.4, trade_count: 14, assets: ["0050", "QQQ"] },
    },
  },
};

const BACKTEST_INTERVALS = [
  { value: "30d", label: "近30天" },
  { value: "90d", label: "近90天" },
  { value: "180d", label: "近半年" },
  { value: "365d", label: "近一年" },
];

function MetricCard({ label, value, unit = "", color = "text-slate-900" }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={["text-2xl font-bold tabular-nums", color].join(" ")}>{value}<span className="text-sm font-normal text-slate-400 ml-1">{unit}</span></p>
    </div>
  );
}

function ModelBacktestSection() {
  const [modelId, setModelId] = useState(MOCK_MODELS[0].id);
  const [version, setVersion] = useState(MOCK_MODELS[0].versions[0]);
  const [interval, setInterval] = useState("90d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [comparing, setComparing] = useState(false);
  const [running, setRunning] = useState(false);

  const model = MOCK_MODELS.find(m => m.id === modelId) ?? MOCK_MODELS[0];
  const result = MOCK_BACKTEST[modelId]?.[version]?.[interval];

  function handleModelChange(id: string) {
    const m = MOCK_MODELS.find(m => m.id === id)!;
    setModelId(id); setVersion(m.versions[0]);
  }

  async function handleRun() {
    setRunning(true);
    await new Promise(r => setTimeout(r, 1200));
    setRunning(false);
  }

  const compVersions = model.versions.slice(0, Math.min(3, model.versions.length));

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="mb-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">回測設定</p>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500">選擇模型</label>
            <select className={inputCls} value={modelId} onChange={e => handleModelChange(e.target.value)}>
              {MOCK_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500">模型版本</label>
            <select className={inputCls} value={version} onChange={e => setVersion(e.target.value)}>
              {model.versions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500">回測區間</label>
            <select className={inputCls} value={interval} onChange={e => setInterval(e.target.value)}>
              {BACKTEST_INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              <option value="custom">自訂區間</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className={btnPrimary} onClick={handleRun} disabled={running} type="button">
              {running ? "執行中…" : "執行回測"}
            </button>
          </div>
        </div>
        {interval === "custom" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5"><label className="text-xs text-slate-500">開始日期</label><input type="date" className={inputCls} value={customStart} onChange={e => setCustomStart(e.target.value)} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-xs text-slate-500">結束日期</label><input type="date" className={inputCls} value={customEnd} onChange={e => setCustomEnd(e.target.value)} /></div>
          </div>
        )}
      </div>

      {result ? (
        <>
          <div className="grid gap-3 sm:grid-cols-5">
            <MetricCard label="勝率" value={`${result.win_rate.toFixed(1)}`} unit="%" color={result.win_rate >= 60 ? "text-emerald-600" : "text-amber-600"} />
            <MetricCard label="平均報酬" value={`+${result.avg_return.toFixed(1)}`} unit="%" color="text-indigo-600" />
            <MetricCard label="最大回撤" value={`${result.max_drawdown.toFixed(1)}`} unit="%" color="text-rose-600" />
            <MetricCard label="期望值" value={result.expected_value.toFixed(2)} unit="%" color={result.expected_value > 0 ? "text-emerald-600" : "text-rose-600"} />
            <MetricCard label="交易次數" value={String(result.trade_count)} unit="次" />
          </div>
          <div className="rounded-xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">本次回測標的（示範資料）</p>
            <div className="flex flex-wrap gap-2">
              {result.assets.map(a => <span key={a} className="rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-mono font-semibold text-indigo-700">{a}</span>)}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-slate-100 bg-white py-10 text-center text-sm text-slate-400 shadow-sm">
          {running ? "執行中，請稍候…" : "選擇模型、版本與區間後執行回測"}
        </div>
      )}

      <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700">版本比較（近90天）</p>
          <button type="button" onClick={() => setComparing(v => !v)} className={btnSecondary}>{comparing ? "收起 ▲" : "展開 ▼"}</button>
        </div>
        {comparing && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50"><tr><Th>版本</Th><Th>勝率</Th><Th>平均報酬</Th><Th>最大回撤</Th><Th>期望值</Th><Th>交易次數</Th></tr></thead>
              <tbody>
                {compVersions.map(v => {
                  const r = MOCK_BACKTEST[modelId]?.[v]?.["90d"];
                  if (!r) return null;
                  return (
                    <tr key={v} className={["hover:bg-slate-50/60", v === version ? "bg-indigo-50/30" : ""].join(" ")}>
                      <Td><span className={["font-mono text-xs px-2 py-0.5 rounded", v === version ? "bg-indigo-100 text-indigo-700 font-semibold" : "bg-slate-100 text-slate-600"].join(" ")}>{v}</span></Td>
                      <Td><span className={r.win_rate >= 60 ? "text-emerald-600 font-semibold" : "text-amber-600"}>{r.win_rate.toFixed(1)}%</span></Td>
                      <Td className="text-indigo-600 font-semibold">+{r.avg_return.toFixed(1)}%</Td>
                      <Td className="text-rose-600">{r.max_drawdown.toFixed(1)}%</Td>
                      <Td className={r.expected_value > 0 ? "text-emerald-600 font-semibold" : "text-rose-600"}>{r.expected_value.toFixed(2)}%</Td>
                      <Td className="text-slate-600">{r.trade_count} 次</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Model Performance (mock data) ─────────────────────────────────────────────
type ModelStatus = "healthy" | "observe" | "adjust" | "disabled";
const MODEL_STATUS_META: Record<ModelStatus, { label: string; color: string }> = {
  healthy: { label: "健康", color: "bg-emerald-50 text-emerald-600" },
  observe: { label: "觀察中", color: "bg-amber-50 text-amber-600" },
  adjust: { label: "需調整", color: "bg-orange-50 text-orange-600" },
  disabled: { label: "停用", color: "bg-slate-100 text-slate-400" },
};
type PerfRow = {
  id: string; model: string; version: string; scope: string; scope_type: "market" | "industry" | "asset";
  win_rate: number; avg_return: number; max_drawdown: number; expected_value: number;
  updated: string; status: ModelStatus; trend: number[];
  top_indicators: { name: string; contribution: number; corr: number }[];
};
const MOCK_PERFORMANCE: PerfRow[] = [
  { id: "tech_v21", model: "科技成長模型", version: "v2.1", scope: "台美科技股", scope_type: "asset", win_rate: 65.8, avg_return: 9.1, max_drawdown: -18.2, expected_value: 4.5, updated: "2026-05-31", status: "healthy", trend: [62.1, 63.5, 68.2, 65.8, 66.4, 65.8], top_indicators: [{ name: "費城半導體指數", contribution: 40, corr: 0.82 }, { name: "VIX波動率", contribution: 20, corr: -0.71 }, { name: "納斯達克漲跌幅", contribution: 25, corr: 0.78 }] },
  { id: "semi_v13", model: "半導體模型", version: "v1.3", scope: "台灣半導體", scope_type: "industry", win_rate: 70.2, avg_return: 11.3, max_drawdown: -15.8, expected_value: 5.8, updated: "2026-05-31", status: "healthy", trend: [65.0, 66.2, 68.5, 70.2, 71.0, 70.2], top_indicators: [{ name: "台指漲跌幅", contribution: 35, corr: 0.75 }, { name: "費城半導體指數", contribution: 35, corr: 0.88 }, { name: "外資買超", contribution: 15, corr: 0.65 }] },
  { id: "etf_v30", model: "ETF波段模型", version: "v3.0", scope: "大盤ETF", scope_type: "market", win_rate: 58.5, avg_return: 5.2, max_drawdown: -9.4, expected_value: 2.1, updated: "2026-04-30", status: "observe", trend: [61.2, 59.8, 57.4, 58.5, 58.0, 58.5], top_indicators: [{ name: "台指漲跌幅", contribution: 45, corr: 0.70 }, { name: "VIX波動率", contribution: 25, corr: -0.62 }, { name: "成交量變化率", contribution: 20, corr: 0.55 }] },
];

function ModelPerformanceSection() {
  const [filterType, setFilterType] = useState<"all" | "market" | "industry" | "asset">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | ModelStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = MOCK_PERFORMANCE.filter(r => {
    if (filterType !== "all" && r.scope_type !== filterType) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <select className={`${inputCls} w-auto`} value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}>
          <option value="all">所有類型</option><option value="market">市場</option><option value="industry">産業</option><option value="asset">標的</option>
        </select>
        <select className={`${inputCls} w-auto`} value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}>
          <option value="all">所有狀態</option>
          {(Object.keys(MODEL_STATUS_META) as ModelStatus[]).map(s => <option key={s} value={s}>{MODEL_STATUS_META[s].label}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-slate-50"><tr><Th>模型</Th><Th>版本</Th><Th>適用範圍</Th><Th>勝率</Th><Th>平均報酬</Th><Th>最大回撤</Th><Th>期望值</Th><Th>最近更新</Th><Th>狀態</Th><Th>詳情</Th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={10} className="py-10 text-center text-sm text-slate-400">無符合條件的模型</td></tr>
              : filtered.map(row => {
                const st = MODEL_STATUS_META[row.status];
                return (
                  <Fragment key={row.id}>
                    <tr className="hover:bg-slate-50/60">
                      <Td><span className="font-semibold text-slate-900">{row.model}</span></Td>
                      <Td><span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{row.version}</span></Td>
                      <Td><span className="text-slate-600">{row.scope}</span></Td>
                      <Td><span className={["font-semibold tabular-nums", row.win_rate >= 65 ? "text-emerald-600" : row.win_rate >= 55 ? "text-amber-600" : "text-rose-600"].join(" ")}>{row.win_rate.toFixed(1)}%</span></Td>
                      <Td><span className="text-indigo-600 font-semibold">+{row.avg_return.toFixed(1)}%</span></Td>
                      <Td><span className="text-rose-600">{row.max_drawdown.toFixed(1)}%</span></Td>
                      <Td><span className={row.expected_value > 0 ? "text-emerald-600 font-semibold" : "text-rose-600"}>{row.expected_value.toFixed(2)}%</span></Td>
                      <Td><span className="text-xs text-slate-400">{row.updated}</span></Td>
                      <Td><Badge label={st.label} color={st.color} /></Td>
                      <Td><button className={btnSecondary} onClick={() => setExpandedId(expandedId === row.id ? null : row.id)} type="button">{expandedId === row.id ? "收起 ▲" : "詳情 ▼"}</button></Td>
                    </tr>
                    {expandedId === row.id && (
                      <tr><td colSpan={10} className="bg-slate-50/60 border-b border-slate-100">
                        <div className="px-6 py-5 grid gap-5 sm:grid-cols-2">
                          <div>
                            <p className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">近6個月勝率趨勢</p>
                            <div className="flex items-end gap-1.5 h-16">
                              {row.trend.map((v, i) => (
                                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                                  <div className="w-full rounded-sm bg-indigo-400" style={{ height: `${(v / 100) * 64}px` }} />
                                  <span className="text-[10px] text-slate-400">{v.toFixed(0)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">指標貢獻度與相關性</p>
                            <div className="flex flex-col gap-2">
                              {row.top_indicators.map(ind => (
                                <div key={ind.name} className="flex items-center gap-3">
                                  <span className="text-sm text-slate-700 w-28 shrink-0 truncate">{ind.name}</span>
                                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-violet-400" style={{ width: `${ind.contribution}%` }} /></div>
                                  <span className="text-xs tabular-nums text-slate-500 w-8">{ind.contribution}%</span>
                                  <span className={["text-xs tabular-nums font-medium w-12 text-right", corrColor(ind.corr)].join(" ")}>{ind.corr > 0 ? "+" : ""}{ind.corr.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td></tr>
                    )}
                  </Fragment>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ModelManagementSection ────────────────────────────────────────────────────
const MODEL_STATUS_OPTS = [
  { value: "active", label: "啟用中", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "testing", label: "測試中", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "disabled", label: "停用", color: "bg-slate-100 text-slate-500 border-slate-200" },
];
const SCOPE_OPTS = [
  { value: "market", label: "市場模型" },
  { value: "industry", label: "產業模型" },
  { value: "asset", label: "標的模型" },
];
function ModelManagementSection() {
  const [rows, setRows] = useState<AnalysisModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [addForm, setAddForm] = useState({ name: "", version: "", scope_type: "market", description: "", status: "testing" });
  const [editRow, setEditRow] = useState<AnalysisModel | null>(null);
  const [editForm, setEditForm] = useState<Partial<AnalysisModel>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await listAnalysisModels()); } catch { /* silently fail */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const g: Record<string, AnalysisModel[]> = { market: [], industry: [], asset: [] };
    rows.forEach(r => { (g[r.scope_type] ??= []).push(r); });
    return g;
  }, [rows]);

  return (
    <div className="flex flex-col gap-5">
      {/* Add form */}
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">新增模型版本</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <input className={inputCls} placeholder="模型名稱 如 美股市場模型" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} />
          <input className={inputCls} placeholder="版本 如 V1 / v2.1" value={addForm.version} onChange={e => setAddForm(p => ({ ...p, version: e.target.value }))} />
          <select className={inputCls} value={addForm.scope_type} onChange={e => setAddForm(p => ({ ...p, scope_type: e.target.value }))}>
            {SCOPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className={inputCls} value={addForm.status} onChange={e => setAddForm(p => ({ ...p, status: e.target.value }))}>
            {MODEL_STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="mt-2 flex gap-3">
          <input className={`${inputCls} flex-1`} placeholder="說明（選填）" value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} />
          <button className={btnPrimary} disabled={saving} type="button" onClick={async () => {
            if (!addForm.name || !addForm.version) { setErr("名稱與版本為必填"); return; }
            setSaving(true); setErr("");
            try { await createAnalysisModel({ name: addForm.name, version: addForm.version, scope_type: addForm.scope_type, description: addForm.description || null, status: addForm.status }); setAddForm({ name: "", version: "", scope_type: "market", description: "", status: "testing" }); load(); }
            catch (e) { setErr(extractErr(e)); } finally { setSaving(false); }
          }}>新增</button>
        </div>
        {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
      </div>

      {/* Grouped by scope */}
      {SCOPE_OPTS.map(scope => (
        <div key={scope.value} className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">{scope.label}</h3>
            <span className="text-xs text-slate-400">{grouped[scope.value]?.length ?? 0} 個版本</span>
          </div>
          {(grouped[scope.value]?.length ?? 0) === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400 text-center">尚無{scope.label}版本</p>
          ) : (
            <table className="min-w-full">
              <thead className="bg-slate-50"><tr><Th>名稱</Th><Th>版本</Th><Th>市場</Th><Th>狀態</Th><Th>說明</Th><Th>操作</Th></tr></thead>
              <tbody>
                {grouped[scope.value].map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    {editRow?.id === row.id ? (
                      <>
                        <Td><input className={inputCls} defaultValue={row.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></Td>
                        <Td><input className={`${inputCls} w-24`} defaultValue={row.version} onChange={e => setEditForm(p => ({ ...p, version: e.target.value }))} /></Td>
                        <Td><input className={`${inputCls} w-20`} defaultValue={row.market_code ?? ""} placeholder="TW / US" onChange={e => setEditForm(p => ({ ...p, market_code: e.target.value || null }))} /></Td>
                        <Td>
                          <select className={inputCls} defaultValue={row.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value as AnalysisModel["status"] }))}>
                            {MODEL_STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </Td>
                        <Td><input className={inputCls} defaultValue={row.description ?? ""} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></Td>
                        <Td><div className="flex gap-1.5">
                          <button className={btnPrimary} disabled={saving} type="button" onClick={async () => { setSaving(true); try { await updateAnalysisModel(row.id, editForm); setEditRow(null); load(); } finally { setSaving(false); } }}>儲存</button>
                          <button className={btnSecondary} type="button" onClick={() => setEditRow(null)}>取消</button>
                        </div></Td>
                      </>
                    ) : (
                      <>
                        <Td><span className="font-semibold text-slate-900">{row.name}</span></Td>
                        <Td><span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{row.version}</span></Td>
                        <Td>{row.market_code ? <span className="font-mono text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">{row.market_code}</span> : <span className="text-xs text-slate-400">—</span>}</Td>
                        <Td>
                          {(() => { const opt = MODEL_STATUS_OPTS.find(o => o.value === row.status) ?? MODEL_STATUS_OPTS[2]; return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${opt.color}`}>{opt.label}</span>; })()}
                        </Td>
                        <Td className="text-slate-400 max-w-[200px] truncate">{row.description ?? "—"}</Td>
                        <Td><div className="flex gap-1.5">
                          <button className={btnSecondary} type="button" onClick={() => { setEditRow(row); setEditForm({}); }}>編輯</button>
                          <button className={btnDanger} type="button" onClick={async () => { if (!confirm(`刪除模型「${row.name} ${row.version}」？`)) return; try { await deleteAnalysisModel(row.id); load(); } catch (e) { alert(extractErr(e)); } }}>刪除</button>
                        </div></Td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

// ── AnalysisTab ───────────────────────────────────────────────────────────────
function AnalysisTab({ markets: _markets }: { markets: MarketConfig[] }) {
  const [subTab, setSubTab] = useState<"models" | "backtest" | "performance">("models");

  const subTabCls = (t: typeof subTab) =>
    ["rounded-lg px-5 py-1.5 text-sm font-medium transition-colors", subTab === t ? "bg-violet-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"].join(" ");

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-100 bg-violet-50/50 p-4 text-sm text-slate-600">
        <strong>分析管理</strong> — 管理各市場產生的模型版本，執行回測並長期追蹤模型績效。公式設定請至各市場的「模組設定」→「自訂公式」。
      </div>
      <div className="flex gap-1 rounded-xl bg-white border border-slate-100 p-1 shadow-sm w-fit">
        <button type="button" onClick={() => setSubTab("models")} className={subTabCls("models")}>模型管理</button>
        <button type="button" onClick={() => setSubTab("backtest")} className={subTabCls("backtest")}>模型回測</button>
        <button type="button" onClick={() => setSubTab("performance")} className={subTabCls("performance")}>模型績效</button>
      </div>
      {subTab === "models" && <ModelManagementSection />}
      {subTab === "backtest" && <ModelBacktestSection />}
      {subTab === "performance" && <ModelPerformanceSection />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: API Config
// ─────────────────────────────────────────────────────────────────────────────

type ApiForm = { code: string; name: string; description: string; base_url: string; api_key: string; extra_params_str: string; headers_str: string; is_active: boolean; crawl_enabled: boolean; crawl_time: string };
function emptyApiForm(): ApiForm { return { code: "", name: "", description: "", base_url: "", api_key: "", extra_params_str: "{}", headers_str: "{}", is_active: true, crawl_enabled: false, crawl_time: "08:00" }; }
function apiFormToPayload(form: ApiForm) { return { code: form.code, name: form.name, description: form.description || null, base_url: form.base_url || null, api_key: form.api_key || null, extra_params: parseJsonSafe(form.extra_params_str), headers: parseJsonSafe(form.headers_str), is_active: form.is_active, crawl_enabled: form.crawl_enabled, crawl_time: form.crawl_time || null }; }

function ApiConfigModal({ title, initial, onClose, onSave }: { title: string; initial: ApiForm; onClose: () => void; onSave: (f: ApiForm) => Promise<void> }) {
  const [form, setForm] = useState<ApiForm>(initial); const [saving, setSaving] = useState(false); const [err, setErr] = useState("");
  function set(k: keyof ApiForm, v: string | boolean) { setForm(p => ({ ...p, [k]: v })); }
  return (
    <Modal title={title} onClose={onClose}>
      <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">代碼 *</label><input className={inputCls} value={form.code} onChange={e => set("code", e.target.value)} placeholder="yfinance" /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">名稱 *</label><input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Yahoo Finance" /></div>
        </div>
        <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">描述</label><input className={inputCls} value={form.description} onChange={e => set("description", e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">API 端點</label><input className={inputCls} value={form.base_url} onChange={e => set("base_url", e.target.value)} placeholder="https://api.example.com/v1" /></div>
        <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">API 金鑰</label><input className={inputCls} type="password" value={form.api_key} onChange={e => set("api_key", e.target.value)} placeholder="sk-…" /></div>
        <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">額外參數（JSON）</label><textarea className={`${inputCls} font-mono text-xs`} rows={3} value={form.extra_params_str} onChange={e => set("extra_params_str", e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Headers（JSON）</label><textarea className={`${inputCls} font-mono text-xs`} rows={3} value={form.headers_str} onChange={e => set("headers_str", e.target.value)} /></div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} />啟用</label>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.crawl_enabled} onChange={e => set("crawl_enabled", e.target.checked)} />每日自動爬取</label>
          {form.crawl_enabled && <div className="flex items-center gap-2"><label className="text-xs font-semibold text-slate-500">爬取時間</label><input type="time" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400" value={form.crawl_time} onChange={e => set("crawl_time", e.target.value)} /></div>}
        </div>
        {err ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p> : null}
        <SaveCancel onCancel={onClose} onSave={async () => { if (!form.code || !form.name) { setErr("代碼與名稱為必填"); return; } if (parseJsonSafe(form.extra_params_str) === null) { setErr("額外參數 JSON 格式錯誤"); return; } setSaving(true); setErr(""); try { await onSave(form); } catch (e) { setErr(extractErr(e)); } finally { setSaving(false); } }} saving={saving} />
      </div>
    </Modal>
  );
}

function ApiConfigTab() {
  const [rows, setRows] = useState<ApiConfig[]>([]); const [loading, setLoading] = useState(false); const [addOpen, setAddOpen] = useState(false); const [editRow, setEditRow] = useState<ApiConfig | null>(null); const [err, setErr] = useState("");
  const load = useCallback(async () => { setLoading(true); try { setRows(await listApiConfigs()); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  function rowToForm(row: ApiConfig): ApiForm { return { code: row.code, name: row.name, description: row.description ?? "", base_url: row.base_url ?? "", api_key: row.api_key ?? "", extra_params_str: row.extra_params ? JSON.stringify(row.extra_params, null, 2) : "{}", headers_str: row.headers ? JSON.stringify(row.headers, null, 2) : "{}", is_active: row.is_active, crawl_enabled: row.crawl_enabled, crawl_time: row.crawl_time ?? "08:00" }; }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">{err ? <p className="mr-auto rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p> : null}<button className={btnPrimary} onClick={() => setAddOpen(true)} type="button">+ 新增 API</button></div>
      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-slate-50"><tr><Th>代碼</Th><Th>名稱</Th><Th>端點</Th><Th>自動爬取</Th><Th>狀態</Th><Th>操作</Th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">載入中…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">尚無 API 設定</td></tr>
              : rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-50/60">
                <Td><span className="font-mono font-semibold text-slate-900">{row.code}</span></Td>
                <Td><div><p className="font-medium text-slate-900">{row.name}</p>{row.description && <p className="text-xs text-slate-400 mt-0.5">{row.description}</p>}</div></Td>
                <Td>{row.base_url ? <span className="font-mono text-xs text-slate-500 max-w-[200px] truncate block" title={row.base_url}>{row.base_url}</span> : <span className="text-slate-400 text-xs">—</span>}{row.api_key && <span className="text-xs text-slate-400">金鑰：••••{row.api_key.slice(-4)}</span>}</Td>
                <Td>{row.crawl_enabled ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">✓ 每日 {row.crawl_time ?? "—"}</span> : <span className="text-xs text-slate-400">未啟用</span>}</Td>
                <Td><Badge label={row.is_active ? "啟用" : "停用"} color={row.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"} /></Td>
                <Td><div className="flex gap-1.5">
                  <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => setEditRow(row)} type="button">編輯</button>
                  <button className={btnDanger} onClick={async () => { if (!confirm(`刪除「${row.name}」？`)) return; try { await deleteApiConfig(row.id); load(); } catch (e) { setErr(extractErr(e)); } }} type="button">刪除</button>
                </div></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {addOpen && <ApiConfigModal title="新增 API 設定" initial={emptyApiForm()} onClose={() => setAddOpen(false)} onSave={async form => { await createApiConfig(apiFormToPayload(form) as Parameters<typeof createApiConfig>[0]); setAddOpen(false); load(); }} />}
      {editRow && <ApiConfigModal title={`編輯 ${editRow.name}`} initial={rowToForm(editRow)} onClose={() => setEditRow(null)} onSave={async form => { await updateApiConfig(editRow.id, apiFormToPayload(form)); setEditRow(null); load(); }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Permission Management (權限管理)
// ─────────────────────────────────────────────────────────────────────────────

const ALL_FEATURES: { key: string; label: string; description: string }[] = [
  { key: "dashboard", label: "儀表板", description: "查看市場總覽、分數、產業動能" },
  { key: "market_analysis", label: "市場分析", description: "市場指標、快照、行情資料" },
  { key: "stocks", label: "股票管理", description: "查看股票列表、詳情與評分" },
  { key: "watchlist", label: "自選股", description: "新增、刪除、查看自選股清單" },
  { key: "portfolio", label: "投資組合", description: "模擬投資組合管理與損益查看" },
  { key: "reports", label: "報告中心", description: "每日報告、績效分析查看" },
  { key: "admin", label: "系統管理", description: "後台管理控制台（完整存取）" },
];

function PermissionsTab() {
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", label: "", description: "", features: [] as string[] });
  const [addSaving, setAddSaving] = useState(false);
  const [err, setErr] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ label: string; description: string; features: string[]; is_active: boolean }>({ label: "", description: "", features: [], is_active: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); try { setRoles(await listRoleConfigs()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleAddFeature(key: string) { setAddForm(p => ({ ...p, features: p.features.includes(key) ? p.features.filter(f => f !== key) : [...p.features, key] })); }
  function toggleEditFeature(key: string) { setEditForm(p => ({ ...p, features: p.features.includes(key) ? p.features.filter(f => f !== key) : [...p.features, key] })); }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-slate-100 bg-amber-50/40 p-4 text-sm text-slate-600">
        <strong>權限管理</strong> — 新增自訂角色並勾選各功能區的存取權限。建立後可在「帳號管理」將角色指派給使用者。
      </div>

      {/* Add role */}
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">新增角色</h3>
        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          <input className={inputCls} placeholder="角色識別碼 如 analyst" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} />
          <input className={inputCls} placeholder="顯示名稱 如 分析師" value={addForm.label} onChange={e => setAddForm(p => ({ ...p, label: e.target.value }))} />
          <input className={inputCls} placeholder="說明（選填）" value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} />
        </div>
        <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">可存取功能區</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {ALL_FEATURES.map(f => (
            <label key={f.key} className={["flex flex-col gap-0.5 rounded-lg border p-3 cursor-pointer transition-colors", addForm.features.includes(f.key) ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-indigo-200"].join(" ")}>
              <div className="flex items-center gap-2"><input type="checkbox" checked={addForm.features.includes(f.key)} onChange={() => toggleAddFeature(f.key)} className="accent-indigo-500" /><span className="text-sm font-medium text-slate-900">{f.label}</span></div>
              <span className="text-xs text-slate-400 pl-5">{f.description}</span>
            </label>
          ))}
        </div>
        {err ? <p className="mb-2 text-sm text-red-500">{err}</p> : null}
        <button className={btnPrimary} disabled={addSaving} onClick={async () => {
          if (!addForm.name || !addForm.label) { setErr("識別碼與顯示名稱為必填"); return; }
          setAddSaving(true); setErr("");
          try { await createRoleConfig({ name: addForm.name, label: addForm.label, description: addForm.description || null, features: addForm.features }); setAddForm({ name: "", label: "", description: "", features: [] }); load(); }
          catch (e) { setErr(extractErr(e)); } finally { setAddSaving(false); }
        }} type="button">新增角色</button>
      </div>

      {/* Roles list */}
      <div className="flex flex-col gap-4">
        {loading ? <div className="py-10 text-center text-sm text-slate-400">載入中…</div>
          : roles.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">尚無角色定義</div>
          : roles.map(role => (
          <div key={role.id} className={["rounded-xl border bg-white p-5 shadow-sm", !role.is_active ? "opacity-60" : "border-slate-100"].join(" ")}>
            {editId === role.id ? (
              <div className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500">顯示名稱</label><input className={inputCls} value={editForm.label} onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))} /></div>
                  <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500">說明</label><input className={inputCls} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">可存取功能區</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_FEATURES.map(f => (
                    <label key={f.key} className={["flex flex-col gap-0.5 rounded-lg border p-3 cursor-pointer transition-colors", editForm.features.includes(f.key) ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-indigo-200"].join(" ")}>
                      <div className="flex items-center gap-2"><input type="checkbox" checked={editForm.features.includes(f.key)} onChange={() => toggleEditFeature(f.key)} className="accent-indigo-500" /><span className="text-sm font-medium text-slate-900">{f.label}</span></div>
                      <span className="text-xs text-slate-400 pl-5">{f.description}</span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked }))} />啟用此角色</label>
                </div>
                <div className="flex justify-end gap-2">
                  <button className={btnSecondary} onClick={() => setEditId(null)} type="button">取消</button>
                  <button className={btnPrimary} disabled={saving} onClick={async () => { setSaving(true); try { await updateRoleConfig(role.id, { label: editForm.label, description: editForm.description, features: editForm.features, is_active: editForm.is_active }); setEditId(null); load(); } finally { setSaving(false); } }} type="button">{saving ? "儲存中…" : "儲存"}</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-semibold text-slate-900">{role.label}</span>
                    <span className="font-mono text-xs text-slate-400">({role.name})</span>
                    {!role.is_active && <Badge label="停用" color="bg-slate-100 text-slate-400" />}
                  </div>
                  {role.description && <p className="text-sm text-slate-500 mb-2">{role.description}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {(role.features ?? []).map(fk => {
                      const feat = ALL_FEATURES.find(f => f.key === fk);
                      return <span key={fk} className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">{feat?.label ?? fk}</span>;
                    })}
                    {(role.features ?? []).length === 0 && <span className="text-xs text-slate-400">無功能存取</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => { setEditId(role.id); setEditForm({ label: role.label, description: role.description ?? "", features: role.features ?? [], is_active: role.is_active }); }} type="button">編輯</button>
                  <button className={btnDanger} onClick={async () => { if (!confirm(`刪除角色「${role.label}」？`)) return; try { await deleteRoleConfig(role.id); load(); } catch (e) { alert(extractErr(e)); } }} type="button">刪除</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Account Management (帳號管理) — last tab, with create/delete
// ─────────────────────────────────────────────────────────────────────────────

function AccountsTab() {
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ role: "user", name: "", new_password: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(""); const [ok, setOk] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", password: "", name: "", role: "user" });
  const [addSaving, setAddSaving] = useState(false);
  const [addErr, setAddErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { const [u, r] = await Promise.all([listUsersAdmin(), listRoleConfigs()]); setUsers(u); setRoles(r); } catch { /* silently fail */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const roleOptions = roles.length > 0 ? roles.map(r => r.name) : ["user", "admin"];
  const roleLabel = (name: string) => roles.find(r => r.name === name)?.label ?? name;

  const ROLE_COLORS: Record<string, string> = { admin: "bg-amber-50 text-amber-700", user: "bg-slate-100 text-slate-600" };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-100 bg-amber-50/50 p-4 text-sm text-slate-600">
        <strong>帳號管理</strong> — 查看所有帳號、修改名稱、密碼與角色。角色在「權限管理」中定義。<span className="text-amber-700 font-medium">admin</span> 可存取所有後台功能。
      </div>
      {ok && <div className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{ok}</div>}
      {err && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{err}</div>}

      <div className="flex justify-end">
        <button className={btnPrimary} onClick={() => { setAddOpen(true); setAddErr(""); setAddForm({ email: "", password: "", name: "", role: "user" }); }} type="button">+ 新增帳號</button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-slate-50"><tr><Th>ID</Th><Th>Email</Th><Th>名稱</Th><Th>角色</Th><Th>加入日期</Th><Th>操作</Th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">載入中…</td></tr>
              : users.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">尚無帳號資料</td></tr>
              : users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50/60">
                {editId === user.id ? (
                  <>
                    <Td><span className="text-slate-400 font-mono text-xs">#{user.id}</span></Td>
                    <Td><span className="text-slate-600">{user.email}</span></Td>
                    <Td><input className={inputCls} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="名稱" /></Td>
                    <Td>
                      <select className={inputCls} value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}>
                        {roleOptions.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                      </select>
                    </Td>
                    <Td><input className={inputCls} type="password" value={editForm.new_password} onChange={e => setEditForm(p => ({ ...p, new_password: e.target.value }))} placeholder="新密碼（留空=不更改）" /></Td>
                    <Td><div className="flex gap-1.5">
                      <button className={btnPrimary} disabled={saving} onClick={async () => {
                        setSaving(true); setErr(""); setOk("");
                        try { const p: Record<string, string> = {}; if (editForm.role) p.role = editForm.role; if (editForm.name) p.name = editForm.name; if (editForm.new_password) p.new_password = editForm.new_password; await updateUserAdmin(user.id, p); setOk("儲存成功"); setEditId(null); load(); }
                        catch (e) { setErr(extractErr(e)); } finally { setSaving(false); }
                      }} type="button">{saving ? "儲存中…" : "儲存"}</button>
                      <button className={btnSecondary} onClick={() => setEditId(null)} type="button">取消</button>
                    </div></Td>
                  </>
                ) : (
                  <>
                    <Td><span className="text-slate-400 font-mono text-xs">#{user.id}</span></Td>
                    <Td><span className="text-slate-900">{user.email}</span></Td>
                    <Td><span className="text-slate-600">{user.name ?? "—"}</span></Td>
                    <Td><Badge label={roleLabel(user.role)} color={ROLE_COLORS[user.role] ?? "bg-slate-100 text-slate-600"} /></Td>
                    <Td className="text-slate-400">{new Date(user.created_at).toLocaleDateString("zh-TW")}</Td>
                    <Td><div className="flex gap-1.5">
                      <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => { setEditId(user.id); setEditForm({ role: user.role, name: user.name ?? "", new_password: "" }); }} type="button">編輯</button>
                      <button className={btnDanger} onClick={async () => { if (!confirm(`刪除帳號 ${user.email}？此操作無法還原！`)) return; try { await deleteUserAdmin(user.id); load(); } catch (e) { setErr(extractErr(e)); } }} type="button">刪除</button>
                    </div></Td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <Modal title="新增帳號" onClose={() => setAddOpen(false)}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email *</label><input className={inputCls} type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} placeholder="user@example.com" /></div>
              <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">名稱</label><input className={inputCls} value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="顯示名稱" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">密碼 *（最少6位）</label><input className={inputCls} type="password" value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••" /></div>
              <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">角色</label>
                <select className={inputCls} value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}>
                  {roleOptions.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
              </div>
            </div>
            {addErr ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{addErr}</p> : null}
            <SaveCancel onCancel={() => setAddOpen(false)} onSave={async () => {
              if (!addForm.email || !addForm.password) { setAddErr("Email 與密碼為必填"); return; }
              if (addForm.password.length < 6) { setAddErr("密碼最少 6 個字元"); return; }
              setAddSaving(true); setAddErr("");
              try { await createUserAdmin({ email: addForm.email, password: addForm.password, name: addForm.name || undefined, role: addForm.role }); setAddOpen(false); setOk("帳號建立成功"); load(); }
              catch (e) { setAddErr(extractErr(e)); } finally { setAddSaving(false); }
            }} saving={addSaving} />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Market Analysis (市場分析)
// ─────────────────────────────────────────────────────────────────────────────

const MARKET_STATUS_COLOR: Record<string, string> = {
  強勢: "bg-green-100 text-green-700",
  偏多: "bg-emerald-50 text-emerald-600",
  中性: "bg-slate-100 text-slate-600",
  偏弱: "bg-amber-100 text-amber-700",
  弱勢: "bg-red-100 text-red-600",
};

function MarketAnalysisTab({ markets }: { markets: MarketConfig[] }) {
  const trackedMarkets = markets.filter(m => m.is_tracked && m.is_active);
  const [marketCode, setMarketCode] = useState<string>(() => trackedMarkets[0]?.code ?? "TW");

  // Indicator input state
  const [recordDate, setRecordDate] = useState<string>(() => {
    const d = new Date(); return d.toISOString().slice(0, 10);
  });
  const [indicatorInputs, setIndicatorInputs] = useState<{
    field_key: string; display_name: string; score: string; raw_value: string; notes: string;
  }[]>([]);
  const [loadingIndicators, setLoadingIndicators] = useState(false);

  // Result state
  const [calcResult, setCalcResult] = useState<MarketScoreResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Snapshot history
  const [snapshots, setSnapshots] = useState<MarketScoreSnapshot[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);

  // Validation
  const [validation, setValidation] = useState<MarketScoreValidation | null>(null);
  const [valLoading, setValLoading] = useState(false);

  // Return input for snapshot
  const [returnEditId, setReturnEditId] = useState<number | null>(null);
  const [returnForm, setReturnForm] = useState({ f5: "", f10: "", f20: "" });

  // Formula items for this market (loaded to build indicator input rows)
  const [formulas, setFormulas] = useState<{ field_key: string; display_name: string }[]>([]);

  const loadFormulas = useCallback(async (mc: string) => {
    try {
      const rows = await listScoreFormulas("market_score", mc);
      const base = rows.length > 0 ? rows : await listScoreFormulas("market_score");
      setFormulas(base.map(r => ({ field_key: r.field_key, display_name: r.display_name })));
    } catch { setFormulas([]); }
  }, []);

  const loadIndicatorValues = useCallback(async (mc: string, rd: string) => {
    setLoadingIndicators(true);
    try {
      const vals = await getIndicatorDailyValues(mc, rd);
      setIndicatorInputs(prev => {
        const valMap = Object.fromEntries(vals.map(v => [v.field_key, v]));
        return formulas.map(f => {
          const existing = valMap[f.field_key];
          return {
            field_key: f.field_key,
            display_name: f.display_name,
            score: existing ? String(existing.score) : "",
            raw_value: existing?.raw_value != null ? String(existing.raw_value) : "",
            notes: existing?.notes ?? "",
          };
        });
      });
    } catch { /* no existing values */ }
    setLoadingIndicators(false);
  }, [formulas]);

  const loadSnapshots = useCallback(async (mc: string) => {
    setSnapshotsLoading(true);
    try { setSnapshots(await listMarketScoreSnapshots(mc, 30)); } catch { setSnapshots([]); }
    setSnapshotsLoading(false);
  }, []);

  const loadValidation = useCallback(async (mc: string) => {
    setValLoading(true);
    try { setValidation(await getMarketScoreValidation(mc)); } catch { setValidation(null); }
    setValLoading(false);
  }, []);

  // When market or formulas change, reload indicator inputs and snapshots
  useEffect(() => { loadFormulas(marketCode); }, [marketCode, loadFormulas]);
  useEffect(() => {
    if (formulas.length > 0) {
      setIndicatorInputs(formulas.map(f => ({ field_key: f.field_key, display_name: f.display_name, score: "", raw_value: "", notes: "" })));
      loadIndicatorValues(marketCode, recordDate);
    }
  }, [formulas, marketCode, recordDate, loadIndicatorValues]);
  useEffect(() => { loadSnapshots(marketCode); loadValidation(marketCode); }, [marketCode, loadSnapshots, loadValidation]);

  // When market changes, reset result
  useEffect(() => { setCalcResult(null); setStatusMsg(null); }, [marketCode]);

  function setInput(idx: number, field: "score" | "raw_value" | "notes", val: string) {
    setIndicatorInputs(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  }

  async function handleSaveInputs() {
    setSaveLoading(true); setStatusMsg(null);
    try {
      const values = indicatorInputs.map(r => ({
        field_key: r.field_key,
        display_name: r.display_name,
        score: parseFloat(r.score) || 50,
        raw_value: r.raw_value !== "" ? parseFloat(r.raw_value) : null,
        notes: r.notes || null,
      }));
      await saveIndicatorDailyValues(marketCode, recordDate, values);
      setStatusMsg({ type: "ok", text: "指標數值已儲存" });
    } catch { setStatusMsg({ type: "err", text: "儲存失敗，請確認登入狀態" }); }
    setSaveLoading(false);
  }

  async function handleCalculate() {
    setCalcLoading(true); setStatusMsg(null); setCalcResult(null);
    try {
      const result = await calculateAndSaveMarketScore(marketCode, recordDate, true);
      setCalcResult(result);
      setStatusMsg({ type: "ok", text: `計算完成，快照已儲存` });
      await loadSnapshots(marketCode);
      await loadValidation(marketCode);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "計算失敗";
      setStatusMsg({ type: "err", text: msg });
    }
    setCalcLoading(false);
  }

  async function handleSaveReturn(snapshotId: number) {
    try {
      await updateSnapshotReturns(snapshotId, {
        future_return_5d: returnForm.f5 !== "" ? parseFloat(returnForm.f5) : undefined,
        future_return_10d: returnForm.f10 !== "" ? parseFloat(returnForm.f10) : undefined,
        future_return_20d: returnForm.f20 !== "" ? parseFloat(returnForm.f20) : undefined,
      });
      setReturnEditId(null);
      await loadSnapshots(marketCode);
      await loadValidation(marketCode);
    } catch { /* noop */ }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Market selector */}
      <div className="flex flex-wrap gap-2">
        {(trackedMarkets.length > 0 ? trackedMarkets : [{ code: "TW", name: "台灣" }, { code: "US", name: "美國" }]).map(m => (
          <button key={m.code} type="button" onClick={() => setMarketCode(m.code)}
            className={["rounded-lg px-4 py-2 text-sm font-medium transition-colors", marketCode === m.code ? "bg-indigo-500 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"].join(" ")}>
            {m.name} ({m.code})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Indicator input */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-semibold text-slate-800">指標分數輸入</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">日期</span>
                <input type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:border-indigo-400" />
              </div>
              <button type="button" onClick={() => loadIndicatorValues(marketCode, recordDate)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
                重新載入
              </button>
            </div>
            {loadingIndicators ? (
              <p className="text-xs text-slate-400">載入中…</p>
            ) : indicatorInputs.length === 0 ? (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                尚未設定市場公式指標。請先至「分析管理 → 公式管理」新增 {marketCode} 市場分數公式項目。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <Th>指標名稱</Th>
                      <Th>分數 (0-100)</Th>
                      <Th>原始數值</Th>
                      <Th>備註</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {indicatorInputs.map((row, i) => (
                      <tr key={row.field_key} className="border-b border-slate-50">
                        <Td><span className="font-medium text-slate-700">{row.display_name}</span><br /><span className="text-slate-400">{row.field_key}</span></Td>
                        <Td>
                          <input
                            type="number" min={0} max={100} step={0.1}
                            value={row.score}
                            onChange={e => setInput(i, "score", e.target.value)}
                            placeholder="0-100"
                            className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:border-indigo-400"
                          />
                        </Td>
                        <Td>
                          <input
                            type="number" step="any"
                            value={row.raw_value}
                            onChange={e => setInput(i, "raw_value", e.target.value)}
                            placeholder="選填"
                            className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:border-indigo-400"
                          />
                        </Td>
                        <Td>
                          <input
                            type="text"
                            value={row.notes}
                            onChange={e => setInput(i, "notes", e.target.value)}
                            placeholder="備註"
                            className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:border-indigo-400"
                          />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={handleSaveInputs} disabled={saveLoading || indicatorInputs.length === 0}
                className={btnSecondary + " text-xs px-3 py-1.5"}>
                {saveLoading ? "儲存中…" : "儲存指標數值"}
              </button>
              <button type="button" onClick={handleCalculate} disabled={calcLoading || indicatorInputs.length === 0}
                className={btnPrimary + " text-xs px-3 py-1.5"}>
                {calcLoading ? "計算中…" : "計算並儲存分數"}
              </button>
            </div>
            {statusMsg && (
              <div className={["mt-3 rounded-lg px-3 py-2 text-xs", statusMsg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"].join(" ")}>
                {statusMsg.text}
              </div>
            )}
          </div>

          {/* Calculation result */}
          {calcResult && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <h3 className="text-sm font-semibold text-slate-800">計算結果</h3>
                <span className={["rounded-full px-3 py-0.5 text-sm font-bold", MARKET_STATUS_COLOR[calcResult.status] ?? "bg-slate-100 text-slate-600"].join(" ")}>
                  {calcResult.score} — {calcResult.status}
                </span>
                <span className="text-xs text-slate-400">權重總和 {calcResult.total_weight}%</span>
                {Math.abs(calcResult.total_weight - 100) > 5 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">⚠ 已自動補正</span>
                )}
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <Th>指標</Th>
                    <Th>原始分</Th>
                    <Th>方向</Th>
                    <Th>有效分</Th>
                    <Th>權重%</Th>
                    <Th>貢獻</Th>
                  </tr>
                </thead>
                <tbody>
                  {calcResult.breakdown.map(b => (
                    <tr key={b.field_key} className="border-b border-slate-50">
                      <Td><span className="font-medium">{b.display_name}</span></Td>
                      <Td>{b.raw_score}</Td>
                      <Td>{b.is_reverse ? <span className="text-rose-500">反向</span> : <span className="text-emerald-600">正向</span>}</Td>
                      <Td>{b.score}</Td>
                      <Td>{b.weight}</Td>
                      <Td><span className="font-medium text-indigo-600">{b.contribution}</span></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Validation stats */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">預測驗證統計</h3>
            {valLoading ? <p className="text-xs text-slate-400">載入中…</p> : validation ? (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 p-3 text-center">
                    <p className="text-xs text-slate-500">樣本數</p>
                    <p className="text-xl font-bold text-slate-800">{validation.total}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-center">
                    <p className="text-xs text-slate-500">命中率</p>
                    <p className={["text-xl font-bold", (validation.hit_rate ?? 0) >= 60 ? "text-green-600" : "text-amber-600"].join(" ")}>
                      {validation.hit_rate != null ? `${validation.hit_rate}%` : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-center">
                    <p className="text-xs text-slate-500">相關係數</p>
                    <p className={["text-xl font-bold", (validation.correlation ?? 0) >= 0.4 ? "text-indigo-600" : "text-slate-500"].join(" ")}>
                      {validation.correlation != null ? validation.correlation : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-center">
                    <p className="text-xs text-slate-500">命中次數</p>
                    <p className="text-xl font-bold text-slate-800">{validation.hit_count}</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">{"命中 = 分數≥80且20日回報>0，或分數<80且回報≤0"}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">尚無驗證資料（需填寫快照的實際回報後顯示）</p>
            )}
          </div>
        </div>
      </div>

      {/* Snapshot history */}
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">歷史快照（最近30筆）</h3>
        {snapshotsLoading ? <p className="text-xs text-slate-400">載入中…</p> : snapshots.length === 0 ? (
          <p className="text-xs text-slate-400">尚無快照記錄</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>日期</Th>
                  <Th>分數</Th>
                  <Th>狀態</Th>
                  <Th>5日報酬%</Th>
                  <Th>10日報酬%</Th>
                  <Th>20日報酬%</Th>
                  <Th>命中</Th>
                  <Th>操作</Th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map(s => (
                  <Fragment key={s.id}>
                    <tr className="border-b border-slate-50 hover:bg-slate-50">
                      <Td>{s.record_date}</Td>
                      <Td><span className="font-bold text-indigo-600">{s.score}</span></Td>
                      <Td><span className={["rounded-full px-2 py-0.5 text-xs font-medium", MARKET_STATUS_COLOR[s.status] ?? "bg-slate-100 text-slate-500"].join(" ")}>{s.status}</span></Td>
                      <Td>{s.future_return_5d != null ? `${s.future_return_5d}%` : "—"}</Td>
                      <Td>{s.future_return_10d != null ? `${s.future_return_10d}%` : "—"}</Td>
                      <Td>{s.future_return_20d != null ? `${s.future_return_20d}%` : "—"}</Td>
                      <Td>
                        {s.is_hit === null ? <span className="text-slate-300">—</span>
                          : s.is_hit ? <span className="text-green-600 font-medium">✓</span>
                          : <span className="text-red-500">✗</span>}
                      </Td>
                      <Td>
                        <button type="button" onClick={() => { setReturnEditId(returnEditId === s.id ? null : s.id); setReturnForm({ f5: String(s.future_return_5d ?? ""), f10: String(s.future_return_10d ?? ""), f20: String(s.future_return_20d ?? "") }); }}
                          className="rounded px-2 py-0.5 text-xs border border-slate-200 text-slate-600 hover:bg-slate-50">
                          填回報
                        </button>
                      </Td>
                    </tr>
                    {returnEditId === s.id && (
                      <tr className="bg-indigo-50/40">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            <label className="flex items-center gap-1">5日 <input type="number" step="0.01" value={returnForm.f5} onChange={e => setReturnForm(p => ({...p, f5: e.target.value}))} className="w-16 rounded border border-slate-200 px-1 py-0.5 focus:outline-none" /></label>
                            <label className="flex items-center gap-1">10日 <input type="number" step="0.01" value={returnForm.f10} onChange={e => setReturnForm(p => ({...p, f10: e.target.value}))} className="w-16 rounded border border-slate-200 px-1 py-0.5 focus:outline-none" /></label>
                            <label className="flex items-center gap-1">20日 <input type="number" step="0.01" value={returnForm.f20} onChange={e => setReturnForm(p => ({...p, f20: e.target.value}))} className="w-16 rounded border border-slate-200 px-1 py-0.5 focus:outline-none" /></label>
                            <button type="button" onClick={() => handleSaveReturn(s.id)} className={btnPrimary + " text-xs px-2 py-0.5"}>儲存</button>
                            <button type="button" onClick={() => setReturnEditId(null)} className={btnSecondary + " text-xs px-2 py-0.5"}>取消</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root page
// ─────────────────────────────────────────────────────────────────────────────

const TABS = ["markets", "industries", "stocks", "asset_roles", "asset_types", "indicators", "events", "analysis", "api", "accounts", "permissions"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  markets: "市場管理",
  industries: "産業管理",
  stocks: "標的管理",
  asset_roles: "標的類型",
  asset_types: "資產管理",
  indicators: "指標管理",
  events: "事件管理",
  analysis: "分析管理",
  api: "API管理",
  accounts: "帳號管理",
  permissions: "權限管理",
};

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("markets");
  const [markets, setMarkets] = useState<MarketConfig[]>([]);
  const [industries, setIndustries] = useState<IndustryRow[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetTypeConfig[]>([]);
  const [authErr, setAuthErr] = useState(false);

  // Pre-load shared data so stocks tab dropdowns work regardless of visit order.
  // Use public endpoints for markets/industries (no auth) so the page loads
  // even before the user interacts with any protected tab.
  useEffect(() => {
    const handle401 = (e: unknown) => {
      if ((e as { response?: { status?: number } })?.response?.status === 401) setAuthErr(true);
    };
    listMarketsPublic().then(r => setMarkets(r)).catch(() => {});
    listIndustriesPublic().then(r => setIndustries(r)).catch(() => {});
    listAssetTypeConfigs().then(r => setAssetTypes(r)).catch(handle401);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white">
              <svg fill="none" height="16" stroke="currentColor" viewBox="0 0 24 24" width="16"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">管理控制台</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">管理市場、產業、股票、資產、指標、分析公式、API、帳號與權限。</p>
        </div>

        {authErr && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
            <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            登入憑證已過期，請重新登入後再訪問此頁面。
          </div>
        )}

        <div className="flex flex-wrap gap-1 rounded-xl bg-white border border-slate-100 p-1 shadow-sm">
          {TABS.map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={["rounded-lg px-3 py-2 text-sm font-medium transition-colors", tab === t ? "bg-indigo-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"].join(" ")}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {tab === "markets" && <MarketsTab onReload={setMarkets} />}
        {tab === "industries" && <IndustriesTab markets={markets} onReload={setIndustries} />}
        {tab === "stocks" && <StocksTab industries={industries} markets={markets} assetTypes={assetTypes} />}
        {tab === "asset_roles" && <AssetRoleTab />}
        {tab === "asset_types" && <AssetTypesTab onReload={setAssetTypes} />}
        {tab === "indicators" && <IndicatorsTab />}
        {tab === "events" && <EventsTab />}
        {tab === "analysis" && <AnalysisTab markets={markets} />}
        {tab === "api" && <ApiConfigTab />}
        {tab === "accounts" && <AccountsTab />}
        {tab === "permissions" && <PermissionsTab />}
      </div>
    </main>
  );
}
