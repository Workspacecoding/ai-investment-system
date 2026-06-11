"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
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
// TAB: Markets
// ─────────────────────────────────────────────────────────────────────────────

function MarketsTab({ onReload }: { onReload: (rows: MarketConfig[]) => void }) {
  const [rows, setRows] = useState<MarketConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [indicators, setIndicators] = useState<MarketIndicatorConfig[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({ code: "", name: "", currency: "", description: "" });
  const [editRow, setEditRow] = useState<MarketConfig | null>(null);
  const [editForm, setEditForm] = useState<Partial<{ name: string; currency: string; description: string; is_active: boolean; is_tracked: boolean }>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await listMarkets(); setRows(r); onReload(r); } catch { /* 401 or network error — show empty */ } finally { setLoading(false); }
  }, [onReload]);

  useEffect(() => { load(); listIndicatorConfigs().then(r => setIndicators(r)).catch(() => {}); }, [load]);

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
          <thead className="bg-slate-50"><tr><Th>順序</Th><Th>顯示於儀表板</Th><Th>代碼</Th><Th>名稱</Th><Th>幣別</Th><Th>狀態</Th><Th>操作</Th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">載入中…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">尚無市場設定</td></tr>
              : rows.map((row, idx) => (
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
                      <Td><label className="flex items-center gap-1.5 cursor-pointer text-sm"><input type="checkbox" defaultChecked={row.is_active} onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked }))} />啟用</label></Td>
                      <Td><div className="flex gap-1.5"><button className={btnPrimary} disabled={saving} onClick={async () => { setSaving(true); try { await updateMarket(editRow!.id, editForm); setEditRow(null); load(); } finally { setSaving(false); } }} type="button">儲存</button><button className={btnSecondary} onClick={() => setEditRow(null)} type="button">取消</button></div></Td>
                    </>
                  ) : (
                    <>
                      <Td><span className="font-mono font-semibold text-slate-900">{row.code}</span></Td>
                      <Td>{row.name}{row.description ? <span className="ml-2 text-xs text-slate-400">{row.description}</span> : null}</Td>
                      <Td>{row.currency}</Td>
                      <Td><Badge label={row.is_active ? "啟用" : "停用"} color={row.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"} /></Td>
                      <Td><div className="flex gap-1.5">
                        <button className="rounded-md border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50" onClick={() => setExpandedId(expandedId === row.id ? null : row.id)} type="button">{expandedId === row.id ? "收起 ▲" : "指標 ▼"}</button>
                        <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => { setEditRow(row); setEditForm({}); }} type="button">編輯</button>
                        <button className={btnDanger} onClick={async () => { if (!confirm(`刪除市場「${row.code}」？`)) return; try { await deleteMarket(row.id); load(); } catch (e) { alert(extractErr(e)); } }} type="button">刪除</button>
                      </div></Td>
                    </>
                  )}
                </tr>
                {expandedId === row.id && (
                  <tr><td colSpan={7}><MarketIndicatorPanel marketId={row.id} allIndicators={indicators} /></td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">✓ 點選 ▲▼ 調整市場顯示順序。勾選「顯示於儀表板」後，該市場卡片將出現在儀表板頂部。</p>
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

function IndustriesTab({ markets, onReload }: { markets: MarketConfig[]; onReload: (rows: IndustryRow[]) => void }) {
  const [rows, setRows] = useState<IndustryRow[]>([]);
  const [tracked, setTracked] = useState<TrackedIndustry[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ industry_code: "", industry_name: "", market: "TW", description: "" });
  const [editRow, setEditRow] = useState<IndustryRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<{ industry_name: string; market: string; description: string }>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [trackingId, setTrackingId] = useState<number | null>(null);
  const [expandedIndId, setExpandedIndId] = useState<number | null>(null);
  const [allIndicators, setAllIndicators] = useState<MarketIndicatorConfig[]>([]);

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

  useEffect(() => { loadBoth(); listIndicatorConfigs().then(r => setAllIndicators(r)).catch(() => {}); }, [loadBoth]);

  const marketOpts = markets.length > 0 ? markets.map(m => m.code) : ["TW", "US", "TWO"];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">新增產業</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <input className={inputCls} placeholder="代碼 如 SEMI" value={form.industry_code} onChange={e => setForm(p => ({ ...p, industry_code: e.target.value.toUpperCase() }))} />
          <input className={inputCls} placeholder="名稱 如 半導體" value={form.industry_name} onChange={e => setForm(p => ({ ...p, industry_name: e.target.value }))} />
          <select className={inputCls} value={form.market} onChange={e => setForm(p => ({ ...p, market: e.target.value }))}>{marketOpts.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <button className={btnPrimary} disabled={saving} onClick={async () => {
            if (!form.industry_code || !form.industry_name) { setErr("代碼與名稱為必填"); return; }
            setSaving(true); setErr("");
            try { await createIndustry({ ...form, description: form.description || undefined }); setForm({ industry_code: "", industry_name: "", market: "TW", description: "" }); loadBoth(); }
            catch (e) { setErr(extractErr(e)); } finally { setSaving(false); }
          }} type="button">新增</button>
        </div>
        <input className={`${inputCls} mt-2`} placeholder="描述（選填）" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        {err ? <p className="mt-2 text-sm text-red-500">{err}</p> : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-slate-50"><tr><Th>追蹤狀態</Th><Th>代碼</Th><Th>名稱</Th><Th>市場</Th><Th>描述</Th><Th>操作</Th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">載入中…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">尚無產業</td></tr>
              : rows.map(row => {
              const status = row.tracking_status ?? "disabled";
              const statusOpt = TRACKING_OPTS.find(o => o.value === status) ?? TRACKING_OPTS[2];
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
                  {editRow?.id === row.id ? (
                    <>
                      <Td><span className="font-mono text-slate-500">{row.industry_code}</span></Td>
                      <Td><input className={inputCls} defaultValue={row.industry_name} onChange={e => setEditForm(p => ({ ...p, industry_name: e.target.value }))} /></Td>
                      <Td><select className={inputCls} defaultValue={row.market} onChange={e => setEditForm(p => ({ ...p, market: e.target.value }))}>{marketOpts.map(c => <option key={c} value={c}>{c}</option>)}</select></Td>
                      <Td><input className={inputCls} defaultValue={row.description ?? ""} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></Td>
                      <Td><div className="flex gap-1.5"><button className={btnPrimary} disabled={saving} onClick={async () => { setSaving(true); try { await updateIndustry(editRow!.id, editForm); setEditRow(null); loadBoth(); } finally { setSaving(false); } }} type="button">儲存</button><button className={btnSecondary} onClick={() => setEditRow(null)} type="button">取消</button></div></Td>
                    </>
                  ) : (
                    <>
                      <Td><span className="font-mono font-semibold">{row.industry_code}</span></Td>
                      <Td><div className="flex items-center gap-2">{row.industry_name}{trackedMap[row.id] !== undefined && <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-600">追蹤中</span>}</div></Td>
                      <Td><Badge label={row.market} color="bg-blue-50 text-blue-600" /></Td>
                      <Td className="text-slate-400 max-w-[160px] truncate">{row.description ?? "—"}</Td>
                      <Td><div className="flex gap-1.5">
                        <button className="rounded-md border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50" onClick={() => setExpandedIndId(expandedIndId === row.id ? null : row.id)} type="button">{expandedIndId === row.id ? "收起 ▲" : "指標 ▼"}</button>
                        <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => { setEditRow(row); setEditForm({}); }} type="button">編輯</button>
                        <button className={btnDanger} onClick={async () => { if (!confirm(`刪除「${row.industry_name}」？`)) return; try { await deleteIndustry(row.id); loadBoth(); } catch (e) { alert(extractErr(e)); } }} type="button">刪除</button>
                      </div></Td>
                    </>
                  )}
                </tr>
                {expandedIndId === row.id && (
                  <tr><td colSpan={6}><IndustryIndicatorPanel industryId={row.id} allIndicators={allIndicators} /></td></tr>
                )}
              </Fragment>
            );
          })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">✓ 設定追蹤狀態（核心追蹤 / 觀察 / 停用）控制產業動能計算範圍。點「指標 ▼」可關聯市場指標。</p>
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

function StocksTab({ industries, markets, assetTypes }: { industries: IndustryRow[]; markets: MarketConfig[]; assetTypes: AssetTypeConfig[] }) {
  const [data, setData] = useState<{ total: number; items: AssetRow[] }>({ total: 0, items: [] });
  const [loading, setLoading] = useState(false);
  const [allIndicators, setAllIndicators] = useState<MarketIndicatorConfig[]>([]);
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [allRoles, setAllRoles] = useState<AssetRole[]>([]);
  const [search, setSearch] = useState(""); const [filterMarket, setFilterMarket] = useState(""); const [filterType, setFilterType] = useState(""); const [page, setPage] = useState(0);
  const [addOpen, setAddOpen] = useState(false); const [editAsset, setEditAsset] = useState<AssetRow | null>(null); const [bulkOpen, setBulkOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await listAdminAssets({ search: search || undefined, market: filterMarket || undefined, asset_type: filterType || undefined, skip: page * limit, limit }); setData(r); }
    catch { /* silently fail */ } finally { setLoading(false); }
  }, [search, filterMarket, filterType, page]);

  useEffect(() => {
    load();
    listIndicatorConfigs().then(r => setAllIndicators(r)).catch(() => {});
    listApiConfigs().then(r => setApiConfigs(r)).catch(() => {});
    listAssetRoles().then(r => setAllRoles(r)).catch(() => {});
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
        <table className="min-w-full">
          <thead className="bg-slate-50"><tr><Th>代碼</Th><Th>名稱</Th><Th>市場</Th><Th>類型</Th><Th>產業</Th><Th>幣別</Th><Th>狀態</Th><Th>操作</Th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-400">載入中…</td></tr>
              : data.items.length === 0 ? <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-400">沒有資料</td></tr>
              : data.items.map(a => (
              <Fragment key={a.id}>
                <tr className="hover:bg-slate-50/60">
                  <Td><span className="font-mono font-semibold text-slate-900">{a.symbol}</span></Td>
                  <Td>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{a.name}</span>
                      {a.in_swing_pool && <span className="rounded px-1 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-600">波段池</span>}
                      {a.in_newsletter && <span className="rounded px-1 py-0.5 text-[10px] font-medium bg-teal-50 text-teal-600">電子報</span>}
                    </div>
                    {a.description && <div className="text-xs text-slate-400 mt-0.5 max-w-[180px] truncate" title={a.description}>{a.description}</div>}
                  </Td>
                  <Td><Badge label={a.market} color="bg-blue-50 text-blue-600" /></Td>
                  <Td><Badge label={atMap[a.asset_type] ?? a.asset_type} color="bg-violet-50 text-violet-600" /></Td>
                  <Td className="text-slate-400">{a.industry_id ? (indMap[a.industry_id] ?? `#${a.industry_id}`) : "—"}</Td>
                  <Td>
                    <div>{a.currency}</div>
                    {a.api_config_id && <div className="text-xs text-indigo-500 mt-0.5">{apiConfigs.find(c => c.id === a.api_config_id)?.name ?? `API#${a.api_config_id}`}</div>}
                  </Td>
                  <Td><Badge label={a.is_active ? "啟用" : "停用"} color={a.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"} /></Td>
                  <Td><div className="flex gap-1.5">
                    <button className="rounded-md border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50" onClick={() => setExpandedId(expandedId === a.id ? null : a.id)} type="button">{expandedId === a.id ? "收起 ▲" : "詳細 ▼"}</button>
                    <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => setEditAsset(a)} type="button">編輯</button>
                    <button className={btnDanger} onClick={async () => { if (!confirm(`停用 ${a.symbol}？`)) return; await deleteAdminAsset(a.id); load(); }} type="button">停用</button>
                  </div></Td>
                </tr>
                {expandedId === a.id && (
                  <tr><td colSpan={8}>
                    <AssetIndicatorPanel assetId={a.id} allIndicators={allIndicators} />
                    <AssetRoleLinkPanel assetId={a.id} allRoles={allRoles} />
                    {a.description && (
                      <div className="px-4 pb-3 bg-slate-50/80 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">備注描述</p>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{a.description}</p>
                      </div>
                    )}
                  </td></tr>
                )}
              </Fragment>
            ))}
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
// TAB: Market Indicators
// ─────────────────────────────────────────────────────────────────────────────

function IndicatorsTab() {
  const [rows, setRows] = useState<MarketIndicatorConfig[]>([]);
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState<MarketIndicatorConfig | null>(null);
  const [editForm, setEditForm] = useState<Partial<MarketIndicatorConfig>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [expandedFormula, setExpandedFormula] = useState<number | null>(null);
  const [addForm, setAddForm] = useState({ field_key: "", display_name: "", unit: "%", description: "", formula: "", display_order: 0 });
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

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">新增指標</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <input className={inputCls} placeholder="欄位鍵（唯一）如 rsi" value={addForm.field_key} onChange={e => setAddForm(p => ({ ...p, field_key: e.target.value }))} />
          <input className={inputCls} placeholder="顯示名稱" value={addForm.display_name} onChange={e => setAddForm(p => ({ ...p, display_name: e.target.value }))} />
          <input className={inputCls} placeholder="單位 如 %" value={addForm.unit} onChange={e => setAddForm(p => ({ ...p, unit: e.target.value }))} />
          <button className={btnPrimary} disabled={addSaving} onClick={async () => {
            if (!addForm.field_key || !addForm.display_name) { setErr("欄位鍵與顯示名稱為必填"); return; }
            setAddSaving(true); setErr("");
            try { await createIndicatorConfig({ field_key: addForm.field_key, display_name: addForm.display_name, unit: addForm.unit, description: addForm.description || null, formula: addForm.formula || null, display_order: addForm.display_order, is_active: true }); setAddForm({ field_key: "", display_name: "", unit: "%", description: "", formula: "", display_order: 0 }); load(); }
            catch (e) { setErr(extractErr(e)); } finally { setAddSaving(false); }
          }} type="button">新增</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 mt-2">
          <input className={inputCls} placeholder="說明（選填）" value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} />
          <input className={inputCls} placeholder="計算公式（選填）" value={addForm.formula} onChange={e => setAddForm(p => ({ ...p, formula: e.target.value }))} />
        </div>
        {err ? <p className="mt-2 text-sm text-red-500">{err}</p> : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-slate-50"><tr><Th>欄位鍵</Th><Th>顯示名稱</Th><Th>單位</Th><Th>排序</Th><Th>API來源</Th><Th>說明/公式</Th><Th>啟用</Th><Th>操作</Th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-400">載入中…</td></tr>
              : rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-50/60">
                {editRow?.id === row.id ? (
                  <>
                    <Td><span className="font-mono text-xs text-slate-400">{row.field_key}</span></Td>
                    <Td><input className={inputCls} defaultValue={row.display_name} onChange={e => setEditForm(p => ({ ...p, display_name: e.target.value }))} /></Td>
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
// Asset Role Link Panel (used inside StocksTab expand)
// ─────────────────────────────────────────────────────────────────────────────

function AssetRoleLinkPanel({ assetId, allRoles }: { assetId: number; allRoles: AssetRole[] }) {
  const [linked, setLinked] = useState<AssetRoleLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { getAssetRoleLinks(assetId).then(r => { setLinked(r); setLoading(false); }).catch(() => setLoading(false)); }, [assetId]);
  const linkedIds = useMemo(() => new Set(linked.map(l => l.role_id)), [linked]);
  async function toggle(role: AssetRole) {
    setSaving(true);
    const newIds = linkedIds.has(role.id) ? [...linkedIds].filter(id => id !== role.id) : [...linkedIds, role.id];
    try { const res = await setAssetRoleLinks(assetId, newIds); setLinked(res); } finally { setSaving(false); }
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
  { type: "market_score", label: "市場公式", description: "計算市場整體走勢分數（MarketScore）" },
  { type: "industry_score", label: "産業公式", description: "計算産業動能分數（IndustryScore）" },
  { type: "stock_score", label: "標的公式", description: "計算個股 / ETF 評分（StockScore）" },
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

// ── AnalysisTab (redesigned: 公式管理 / 模型回測 / 模型績效) ─────────────────
function AnalysisTab({ markets }: { markets: MarketConfig[] }) {
  const [subTab, setSubTab] = useState<"formula" | "backtest" | "performance">("formula");
  const [allIndicators, setAllIndicators] = useState<MarketIndicatorConfig[]>([]);
  const [latestCorrMap, setLatestCorrMap] = useState<Record<string, number | null>>({});

  const loadCorr = useCallback(() => {
    listIndicatorConfigs().then(r => setAllIndicators(r)).catch(() => {});
    listFactorCorrReports().then(reports => {
      if (reports.length === 0) return;
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const prev = reports.find(r => r.report_month < currentMonthStr) ?? reports[0];
      if (prev?.factor_entries) {
        const map: Record<string, number | null> = {};
        (prev.factor_entries as FactorEntry[]).forEach(fe => { map[fe.field_key] = fe.corr_score; });
        setLatestCorrMap(map);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => { loadCorr(); }, [loadCorr]);

  const subTabCls = (t: typeof subTab) =>
    ["rounded-lg px-5 py-1.5 text-sm font-medium transition-colors", subTab === t ? "bg-violet-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"].join(" ");

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-100 bg-violet-50/50 p-4 text-sm text-slate-600">
        <strong>公式 / 模型管理</strong> — 設定評分公式加權比例，執行模型回測，並長期追蹤模型績效。
      </div>
      <div className="flex gap-1 rounded-xl bg-white border border-slate-100 p-1 shadow-sm w-fit">
        <button type="button" onClick={() => setSubTab("formula")} className={subTabCls("formula")}>公式管理</button>
        <button type="button" onClick={() => setSubTab("backtest")} className={subTabCls("backtest")}>模型回測</button>
        <button type="button" onClick={() => setSubTab("performance")} className={subTabCls("performance")}>模型績效</button>
      </div>
      {subTab === "formula" && <FormulaManagementSection allIndicators={allIndicators} latestCorrMap={latestCorrMap} markets={markets} />}
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

const TABS = ["markets", "industries", "stocks", "asset_roles", "asset_types", "indicators", "analysis", "market_analysis", "api", "accounts", "permissions"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  markets: "市場管理",
  industries: "産業管理",
  stocks: "標的管理",
  asset_roles: "標的類型",
  asset_types: "資產管理",
  indicators: "市場指標",
  analysis: "分析管理",
  market_analysis: "市場分析",
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
        {tab === "analysis" && <AnalysisTab markets={markets} />}
        {tab === "market_analysis" && <MarketAnalysisTab markets={markets} />}
        {tab === "api" && <ApiConfigTab />}
        {tab === "accounts" && <AccountsTab />}
        {tab === "permissions" && <PermissionsTab />}
      </div>
    </main>
  );
}
