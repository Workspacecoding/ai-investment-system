"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type ApiConfig,
  type AssetIndicatorLink,
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
  createAssetTypeConfig,
  createIndicatorConfig,
  createIndustry,
  createMarket,
  createRoleConfig,
  createScoreFormula,
  createUserAdmin,
  deleteAdminAsset,
  deleteApiConfig,
  deleteAssetTypeConfig,
  deleteIndicatorConfig,
  deleteIndustry,
  deleteMarket,
  deleteRoleConfig,
  deleteScoreFormula,
  deleteUserAdmin,
  getAssetIndicators,
  getIndustryIndicators,
  getMarketIndicators,
  listAdminAssets,
  listAdminIndustries,
  listApiConfigs,
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
  setIndustryIndicators,
  setMarketIndicators,
  updateAdminAsset,
  updateApiConfig,
  updateAssetTypeConfig,
  updateIndicatorConfig,
  updateIndustry,
  updateMarket,
  updateRoleConfig,
  updateScoreFormula,
  updateUserAdmin,
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
          <thead className="bg-slate-50"><tr><Th>追蹤</Th><Th>代碼</Th><Th>名稱</Th><Th>市場</Th><Th>描述</Th><Th>操作</Th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">載入中…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">尚無產業</td></tr>
              : rows.map(row => (
              <Fragment key={row.id}>
                <tr className={["hover:bg-slate-50/60", trackedMap[row.id] !== undefined ? "bg-indigo-50/30" : ""].join(" ")}>
                  <Td><input type="checkbox" checked={trackedMap[row.id] !== undefined} disabled={trackingId === row.id} onChange={async () => {
                    setTrackingId(row.id);
                    const tid = trackedMap[row.id];
                    try { if (tid !== undefined) { await removeTrackedIndustry(tid); } else { await addTrackedIndustry(row.id); } setTracked(await listTrackedIndustries()); } finally { setTrackingId(null); }
                  }} className="h-4 w-4 rounded accent-indigo-500 cursor-pointer" /></Td>
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
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">✓ 勾選追蹤後顯示於儀表板「產業動能」區塊。點「指標 ▼」可關聯市場指標。</p>
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

type AssetForm = { symbol: string; name: string; market: string; asset_type: string; currency: string; industry_id: string; api_config_id: string; description: string; is_penny_stock: boolean; is_active: boolean };
function emptyAssetForm(): AssetForm { return { symbol: "", name: "", market: "TW", asset_type: "stock", currency: "TWD", industry_id: "", api_config_id: "", description: "", is_penny_stock: false, is_active: true }; }

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
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">資料 API</label>
          <select className={inputCls} value={form.api_config_id} onChange={e => set("api_config_id", e.target.value)}>
            <option value="">— 不指定 —</option>{apiConfigs.filter(a => a.is_active).map(a => <option key={a.id} value={String(a.id)}>{a.name}（{a.code}）</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">備注描述</label>
          <textarea className={`${inputCls} resize-y`} rows={3} value={form.description} onChange={e => set("description", e.target.value)} placeholder="選填：投資邏輯、分析備注…" />
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.is_penny_stock} onChange={e => set("is_penny_stock", e.target.checked)} />雞蛋水餃股</label>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} />啟用</label>
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
                    <div>{a.name}</div>
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
                    <button className="rounded-md border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50" onClick={() => setExpandedId(expandedId === a.id ? null : a.id)} type="button">{expandedId === a.id ? "收起 ▲" : "指標 ▼"}</button>
                    <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => setEditAsset(a)} type="button">編輯</button>
                    <button className={btnDanger} onClick={async () => { if (!confirm(`停用 ${a.symbol}？`)) return; await deleteAdminAsset(a.id); load(); }} type="button">停用</button>
                  </div></Td>
                </tr>
                {expandedId === a.id && (
                  <tr><td colSpan={8}>
                    <AssetIndicatorPanel assetId={a.id} allIndicators={allIndicators} />
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
      {addOpen && <AssetModal title="新增股票" initial={emptyAssetForm()} industries={industries} markets={markets} assetTypes={assetTypes} apiConfigs={apiConfigs} onClose={() => setAddOpen(false)} onSave={async form => { await createAdminAsset({ symbol: form.symbol, name: form.name, market: form.market, asset_type: form.asset_type, currency: form.currency, industry_id: form.industry_id ? Number(form.industry_id) : undefined, api_config_id: form.api_config_id ? Number(form.api_config_id) : null, description: form.description || null, is_penny_stock: form.is_penny_stock }); setAddOpen(false); load(); }} />}
      {editAsset && <AssetModal title={`編輯 ${editAsset.symbol}`} initial={{ symbol: editAsset.symbol, name: editAsset.name, market: editAsset.market, asset_type: editAsset.asset_type, currency: editAsset.currency, industry_id: editAsset.industry_id ? String(editAsset.industry_id) : "", api_config_id: editAsset.api_config_id ? String(editAsset.api_config_id) : "", description: editAsset.description ?? "", is_penny_stock: editAsset.is_penny_stock, is_active: editAsset.is_active }} industries={industries} markets={markets} assetTypes={assetTypes} apiConfigs={apiConfigs} onClose={() => setEditAsset(null)} onSave={async form => { await updateAdminAsset(editAsset.id, { name: form.name, market: form.market, asset_type: form.asset_type, currency: form.currency, industry_id: form.industry_id ? Number(form.industry_id) : null, api_config_id: form.api_config_id ? Number(form.api_config_id) : null, description: form.description || null, is_penny_stock: form.is_penny_stock, is_active: form.is_active }); setEditAsset(null); load(); }} />}
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
        <strong>資產管理</strong> — 定義資產類別（如股票、加密貨幣、保險等）。這些類別會同步到「股票列表」的資產類型下拉選單。
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
// TAB: Analysis (分析管理)
// ─────────────────────────────────────────────────────────────────────────────

type FactorEntry = { field_key: string; display_name: string; weight: number; corr_score: number | null };

function corrColor(v: number | null) {
  if (v === null) return "text-slate-400";
  if (v >= 0.7) return "text-emerald-600 font-semibold";
  if (v >= 0.4) return "text-amber-600 font-semibold";
  return "text-red-500 font-semibold";
}

// ── Formula section: one market's scoring formula ─────────────────────────────

function MarketFormulaSection({
  marketName,
  allIndicators,
  latestCorrMap,
}: {
  marketName: string;
  allIndicators: MarketIndicatorConfig[];
  latestCorrMap: Record<string, number | null>;
}) {
  const formulaType = "market_score";
  const [rows, setRows] = useState<ScoreFormula[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ScoreFormula>>({});
  const [saving, setSaving] = useState(false);
  const [addIndId, setAddIndId] = useState<string>("");
  const [addWeight, setAddWeight] = useState(0);
  const [addSaving, setAddSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await listScoreFormulas(formulaType)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeRows = rows.filter(r => r.is_active && r.use_in_calc);
  const totalWeight = activeRows.reduce((s, r) => s + r.weight, 0);
  const linkedKeys = new Set(rows.map(r => r.field_key));
  const availableInds = allIndicators.filter(i => !linkedKeys.has(i.field_key));

  // Build human-readable formula string: "台指漲跌幅 × 40% + VIX × 20% + ... = 90"
  const formulaStr = activeRows.map((r, i) => {
    const prefix = i === 0 ? "" : " + ";
    return `${prefix}${r.display_name} × ${r.weight}%`;
  }).join("") + (activeRows.length > 0 ? " = 市場分數" : "");

  async function handleAdd() {
    setErr("");
    const selectedInd = allIndicators.find(i => String(i.id) === addIndId);
    if (!selectedInd) { setErr("請選擇指標"); return; }
    setAddSaving(true);
    try {
      await createScoreFormula({ formula_type: formulaType, market_code: null, field_key: selectedInd.field_key, display_name: selectedInd.display_name, weight: addWeight, is_active: true, use_in_calc: true, is_reverse: false, display_order: rows.length + 1 });
      setAddIndId(""); setAddWeight(0); load();
    } catch (e) { setErr(extractErr(e)); } finally { setAddSaving(false); }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Formula notation card */}
      {activeRows.length > 0 && (
        <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-5 py-4 shadow-sm">
          <p className="mb-1 text-xs font-semibold text-violet-500 uppercase tracking-wide">{marketName} · 市場分數計算公式</p>
          <p className="text-sm font-medium text-slate-700 leading-relaxed break-all">{formulaStr}</p>
          <p className="mt-2 text-xs text-slate-500">真實市場方向同步分數：<span className="font-semibold text-violet-600">{totalWeight.toFixed(0)}分基準（加權總和）</span></p>
        </div>
      )}

      {/* Add factor */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">新增因子（從市場指標選取）</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <select className={inputCls} value={addIndId} onChange={e => setAddIndId(e.target.value)}>
            <option value="">— 選擇市場指標 —</option>
            {availableInds.map(i => <option key={i.id} value={String(i.id)}>{i.display_name}（{i.field_key}）</option>)}
            {availableInds.length === 0 && <option disabled>所有指標已加入</option>}
          </select>
          <div className="flex items-center gap-2">
            <input type="number" className={inputCls} placeholder="加權 %" value={addWeight} onChange={e => setAddWeight(Number(e.target.value))} min={0} max={100} step={5} />
            <span className="shrink-0 text-sm text-slate-500">%</span>
          </div>
          <button className={btnPrimary} disabled={addSaving || !addIndId} onClick={handleAdd} type="button">新增因子</button>
        </div>
        {err ? <p className="mt-2 text-sm text-red-500">{err}</p> : null}
      </div>

      {/* Weight progress bar */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
          <div className={["h-full rounded-full transition-all", totalWeight > 100 ? "bg-red-400" : totalWeight >= 95 ? "bg-emerald-500" : "bg-indigo-400"].join(" ")} style={{ width: `${Math.min(totalWeight, 100)}%` }} />
        </div>
        <span className={["text-sm font-bold", totalWeight > 100 ? "text-red-500" : totalWeight >= 95 ? "text-emerald-600" : "text-slate-700"].join(" ")}>{totalWeight.toFixed(1)}%</span>
        <span className="text-xs text-slate-400">（啟用且納入計算的加權總和，建議 100%）</span>
      </div>

      {/* Factor table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-slate-50"><tr><Th>納入計算</Th><Th>指標名稱</Th><Th>欄位鍵</Th><Th>加權 (%)</Th><Th>相關係數（上月）</Th><Th>啟用</Th><Th>操作</Th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">載入中…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">尚無因子，請新增</td></tr>
              : rows.map(row => {
              const corr = latestCorrMap[row.field_key] ?? null;
              return (
              <tr key={row.id} className={["hover:bg-slate-50/60", !row.is_active ? "opacity-50" : ""].join(" ")}>
                <Td><input type="checkbox" checked={row.use_in_calc} className="h-4 w-4 rounded accent-indigo-500 cursor-pointer" onChange={async () => { await updateScoreFormula(row.id, { use_in_calc: !row.use_in_calc }); load(); }} /></Td>
                {editId === row.id ? (
                  <>
                    <Td><input className={inputCls} defaultValue={row.display_name} onChange={e => setEditForm(p => ({ ...p, display_name: e.target.value }))} /></Td>
                    <Td><span className="font-mono text-xs text-slate-500">{row.field_key}</span></Td>
                    <Td><input type="number" className={`${inputCls} w-20`} defaultValue={row.weight} onChange={e => setEditForm(p => ({ ...p, weight: Number(e.target.value) }))} min={0} max={100} step={5} /></Td>
                    <Td><span className={corrColor(corr)}>{corr != null ? corr.toFixed(3) : "—"}</span></Td>
                    <Td><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked={row.is_active} onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked }))} />啟用</label></Td>
                    <Td><div className="flex gap-1.5">
                      <button className={btnPrimary} disabled={saving} onClick={async () => { setSaving(true); try { await updateScoreFormula(row.id, { weight: editForm.weight, is_active: editForm.is_active, display_name: editForm.display_name }); setEditId(null); load(); } finally { setSaving(false); } }} type="button">儲存</button>
                      <button className={btnSecondary} onClick={() => setEditId(null)} type="button">取消</button>
                      <button className={btnDanger} onClick={async () => { if (!confirm("刪除此因子？")) return; await deleteScoreFormula(row.id); load(); }} type="button">刪除</button>
                    </div></Td>
                  </>
                ) : (
                  <>
                    <Td><span className="font-medium text-slate-900">{row.display_name}</span></Td>
                    <Td><span className="font-mono text-xs text-slate-500">{row.field_key}</span></Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-indigo-400" style={{ width: `${Math.min(row.weight, 100)}%` }} /></div>
                        <span className="text-sm font-semibold tabular-nums text-slate-700">{row.weight}%</span>
                      </div>
                    </Td>
                    <Td><span className={corrColor(corr)}>{corr != null ? corr.toFixed(3) : <span className="text-xs text-slate-400">—</span>}</span></Td>
                    <Td><Badge label={row.is_active ? "啟用" : "停用"} color={row.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"} /></Td>
                    <Td><button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => { setEditId(row.id); setEditForm({ weight: row.weight, is_active: row.is_active, display_name: row.display_name }); }} type="button">編輯</button></Td>
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

// ── Analysis sub-tab: Factor Management ──────────────────────────────────────

function FactorManagementSection({
  allMarkets,
  latestCorrMap,
}: {
  allMarkets: MarketConfig[];
  latestCorrMap: Record<string, number | null>;
}) {
  const [rows, setRows] = useState<MarketIndicatorConfig[]>([]);
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState<MarketIndicatorConfig | null>(null);
  const [editForm, setEditForm] = useState<Partial<MarketIndicatorConfig & { api_config_id: number | null; api_source: string | null }>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedMarkets, setExpandedMarkets] = useState<Record<number, MarketConfig[]>>({});
  const [addForm, setAddForm] = useState({ field_key: "", display_name: "", unit: "%", description: "", formula: "", display_order: 0 });
  const [addSaving, setAddSaving] = useState(false);
  const [formulaRows, setFormulaRows] = useState<ScoreFormula[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inds, apis, formulas] = await Promise.all([listIndicatorConfigs(), listApiConfigs(), listScoreFormulas("market_score")]);
      setRows(inds); setApiConfigs(apis); setFormulaRows(formulas);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const apiMap = useMemo(() => { const m: Record<number, string> = {}; apiConfigs.forEach(a => { m[a.id] = a.name; }); return m; }, [apiConfigs]);
  const weightMap = useMemo(() => { const m: Record<string, number> = {}; formulaRows.forEach(f => { m[f.field_key] = f.weight; }); return m; }, [formulaRows]);

  async function loadMarketLinks(indId: number) {
    if (expandedMarkets[indId]) { setExpandedId(expandedId === indId ? null : indId); return; }
    // Find markets linked to this indicator by checking each tracked market
    const linked: MarketConfig[] = [];
    await Promise.all(allMarkets.map(async m => {
      try {
        const links = await getMarketIndicators(m.id);
        if (links.some(l => l.indicator_config_id === indId)) linked.push(m);
      } catch { /* skip */ }
    }));
    setExpandedMarkets(p => ({ ...p, [indId]: linked }));
    setExpandedId(expandedId === indId ? null : indId);
  }

  function apiLabel(row: MarketIndicatorConfig) {
    if (row.api_source) return row.api_source;
    if (row.api_config_id && apiMap[row.api_config_id]) return apiMap[row.api_config_id];
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Add form */}
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">新增因子指標</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <input className={inputCls} placeholder="欄位鍵（唯一）如 vix" value={addForm.field_key} onChange={e => setAddForm(p => ({ ...p, field_key: e.target.value }))} />
          <input className={inputCls} placeholder="顯示名稱 如 VIX恐慌指數" value={addForm.display_name} onChange={e => setAddForm(p => ({ ...p, display_name: e.target.value }))} />
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

      {/* Factor table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <Th>欄位鍵</Th>
              <Th>顯示名稱</Th>
              <Th>單位</Th>
              <Th>排序</Th>
              <Th>公式加權</Th>
              <Th>上月相關係數</Th>
              <Th>關聯 API</Th>
              <Th>啟用</Th>
              <Th>操作</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} className="py-10 text-center text-sm text-slate-400">載入中…</td></tr>
              : rows.map(row => {
              const corr = latestCorrMap[row.field_key] ?? null;
              const weight = weightMap[row.field_key] ?? null;
              const api = apiLabel(row);
              return (
              <Fragment key={row.id}>
                <tr className={["hover:bg-slate-50/60", !row.is_active ? "opacity-50" : ""].join(" ")}>
                  {editRow?.id === row.id ? (
                    <>
                      <Td><span className="font-mono text-xs text-slate-400">{row.field_key}</span></Td>
                      <Td><input className={inputCls} defaultValue={row.display_name} onChange={e => setEditForm(p => ({ ...p, display_name: e.target.value }))} /></Td>
                      <Td><input className={`${inputCls} w-16`} defaultValue={row.unit} onChange={e => setEditForm(p => ({ ...p, unit: e.target.value }))} /></Td>
                      <Td><input type="number" className={`${inputCls} w-16`} defaultValue={row.display_order} onChange={e => setEditForm(p => ({ ...p, display_order: Number(e.target.value) }))} /></Td>
                      <Td><span className="text-xs text-slate-400">{weight != null ? `${weight}%` : "—"}</span></Td>
                      <Td><span className={corrColor(corr)}>{corr != null ? corr.toFixed(3) : "—"}</span></Td>
                      <Td>
                        <div className="flex flex-col gap-1">
                          <select className={inputCls} defaultValue={String(row.api_config_id ?? "")} onChange={e => setEditForm(p => ({ ...p, api_config_id: e.target.value ? Number(e.target.value) : null }))}>
                            <option value="">— 不指定 —</option>{apiConfigs.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                          </select>
                          <input className={`${inputCls} text-xs`} defaultValue={row.api_source ?? ""} placeholder="自訂 API 名稱" onChange={e => setEditForm(p => ({ ...p, api_source: e.target.value || null }))} />
                        </div>
                      </Td>
                      <Td><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked={row.is_active} onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked }))} />啟用</label></Td>
                      <Td><div className="flex gap-1.5">
                        <button className={btnPrimary} disabled={saving} onClick={async () => { setSaving(true); try { await updateIndicatorConfig(editRow!.id, editForm); setEditRow(null); load(); } catch (e) { setErr(extractErr(e)); } finally { setSaving(false); } }} type="button">儲存</button>
                        <button className={btnSecondary} onClick={() => setEditRow(null)} type="button">取消</button>
                      </div></Td>
                    </>
                  ) : (
                    <>
                      <Td><span className="font-mono text-xs text-slate-500">{row.field_key}</span></Td>
                      <Td><span className="font-medium text-slate-900">{row.display_name}</span></Td>
                      <Td>{row.unit}</Td>
                      <Td>{row.display_order}</Td>
                      <Td>
                        {weight != null
                          ? <div className="flex items-center gap-1.5"><div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-indigo-400" style={{ width: `${Math.min(weight, 100)}%` }} /></div><span className="text-xs font-semibold text-slate-700 tabular-nums">{weight}%</span></div>
                          : <span className="text-xs text-slate-400">未加入</span>}
                      </Td>
                      <Td><span className={corrColor(corr)}>{corr != null ? corr.toFixed(3) : <span className="text-xs text-slate-400">—</span>}</span></Td>
                      <Td>{api ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">🔗 {api}</span> : <span className="text-xs text-slate-400">未設定</span>}</Td>
                      <Td><Badge label={row.is_active ? "啟用" : "停用"} color={row.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"} /></Td>
                      <Td>
                        <div className="flex gap-1.5">
                          <button className="rounded-md border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50" onClick={() => loadMarketLinks(row.id)} type="button">
                            {expandedId === row.id ? "收起 ▲" : "關聯 ▼"}
                          </button>
                          <button className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => { setEditRow(row); setEditForm({}); }} type="button">編輯</button>
                          <button className={btnDanger} onClick={async () => { if (!confirm(`刪除因子「${row.display_name}」？此操作不可逆。`)) return; try { await deleteIndicatorConfig(row.id); load(); } catch (e) { alert(extractErr(e)); } }} type="button">刪除</button>
                        </div>
                      </Td>
                    </>
                  )}
                </tr>
                {expandedId === row.id && (
                  <tr><td colSpan={9} className="bg-slate-50/80 border-b border-slate-100">
                    <div className="px-5 py-3 flex flex-col gap-3">
                      {/* Description / formula */}
                      {(row.description || row.formula) && (
                        <div>
                          {row.description && <p className="text-xs text-slate-600">{row.description}</p>}
                          {row.formula && <p className="mt-1 font-mono text-xs text-indigo-600 bg-indigo-50/60 px-2 py-1 rounded">{row.formula}</p>}
                        </div>
                      )}
                      {/* Linked markets */}
                      <div>
                        <p className="mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">關聯市場</p>
                        <div className="flex flex-wrap gap-2">
                          {(expandedMarkets[row.id] ?? []).length === 0
                            ? <span className="text-xs text-slate-400">尚未關聯任何市場（至「市場管理」→ 指標 ▼ 進行設定）</span>
                            : (expandedMarkets[row.id] ?? []).map(m => (
                              <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-medium text-blue-700">
                                {m.name} <span className="text-blue-400">({m.code})</span>
                              </span>
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

// ── Analysis sub-tab: Monthly Reports (view-only) ─────────────────────────────

function MonthlyReportSection() {
  const [reports, setReports] = useState<FactorCorrReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setReports(await listFactorCorrReports()); } catch { /* silently fail */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Format report_month "2026-01" → "01/01–01/31"
  function formatMonthRange(month: string) {
    const [year, m] = month.split("-");
    const lastDay = new Date(Number(year), Number(m), 0).getDate();
    return `${m}/01–${m}/${lastDay}`;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-500">
        月度報表僅供查閱。七月時顯示六月數據（上個完整月份），因子相關係數同步至公式管理的「相關係數（上月）」欄位。
      </div>
      {loading ? <div className="py-10 text-center text-sm text-slate-400">載入中…</div>
        : reports.length === 0 ? <div className="rounded-xl border border-slate-100 bg-white py-10 text-center text-sm text-slate-400 shadow-sm">尚無月度報表記錄</div>
        : reports.map(r => {
          const entries = (r.factor_entries ?? []) as FactorEntry[];
          return (
          <div key={r.id} className="rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm font-semibold text-slate-800">{formatMonthRange(r.report_month)}</span>
                <span className="text-xs text-slate-400">{r.report_month}</span>
                {r.market_score_actual_corr != null && (
                  <span className="text-xs text-slate-500">
                    市場準確度：<span className={corrColor(r.market_score_actual_corr)}>{r.market_score_actual_corr.toFixed(3)}</span>
                  </span>
                )}
                {entries.length > 0 && (
                  <span className="text-xs text-slate-400">因子相關係數：
                    {entries.slice(0, 3).map((fe, i) => (
                      <span key={i} className="ml-1">{fe.display_name} <span className={corrColor(fe.corr_score)}>{fe.corr_score != null ? fe.corr_score.toFixed(2) : "—"}</span></span>
                    ))}
                    {entries.length > 3 && <span className="ml-1 text-slate-400">…</span>}
                  </span>
                )}
              </div>
              {entries.length > 0 && (
                <button className="rounded-md border border-indigo-200 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 shrink-0" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} type="button">
                  {expandedId === r.id ? "收起 ▲" : `展開 ${entries.length} 因子 ▼`}
                </button>
              )}
            </div>
            {expandedId === r.id && entries.length > 0 && (
              <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/60">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {entries.map((fe, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                      <div><p className="font-medium text-slate-800">{fe.display_name}</p><p className="text-xs text-slate-400">{fe.field_key} · 加權 {fe.weight}%</p></div>
                      <span className={corrColor(fe.corr_score)}>{fe.corr_score != null ? fe.corr_score.toFixed(3) : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AnalysisTab({ markets }: { markets: MarketConfig[] }) {
  const [subTab, setSubTab] = useState<"formula" | "factors" | "report">("formula");
  const [activeMarketId, setActiveMarketId] = useState<number | null>(null);
  const [allIndicators, setAllIndicators] = useState<MarketIndicatorConfig[]>([]);
  const [latestCorrMap, setLatestCorrMap] = useState<Record<string, number | null>>({});

  const activeMarkets = useMemo(() => markets.filter(m => m.is_active), [markets]);

  useEffect(() => {
    if (activeMarketId === null && activeMarkets.length > 0) setActiveMarketId(activeMarkets[0].id);
  }, [activeMarkets, activeMarketId]);

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

  const activeMarket = activeMarkets.find(m => m.id === activeMarketId);

  const subTabCls = (t: typeof subTab) =>
    ["rounded-lg px-5 py-1.5 text-sm font-medium transition-colors", subTab === t ? "bg-violet-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"].join(" ");

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-100 bg-violet-50/50 p-4 text-sm text-slate-600">
        <strong>分析管理</strong> — 管理計算因子、設定各市場評分公式加權比例，並查閱每月因子相關係數記錄。
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-xl bg-white border border-slate-100 p-1 shadow-sm w-fit">
        <button type="button" onClick={() => setSubTab("formula")} className={subTabCls("formula")}>公式管理</button>
        <button type="button" onClick={() => setSubTab("factors")} className={subTabCls("factors")}>因子管理</button>
        <button type="button" onClick={() => setSubTab("report")} className={subTabCls("report")}>月度報表</button>
      </div>

      {/* ── 公式管理: market-name tabs + formula notation ── */}
      {subTab === "formula" && (
        <div className="flex flex-col gap-4">
          {activeMarkets.length === 0 ? (
            <div className="rounded-xl border border-slate-100 bg-white py-8 text-center text-sm text-slate-400 shadow-sm">請先至「市場管理」新增並啟用市場</div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1 rounded-xl bg-white border border-slate-100 p-1 shadow-sm w-fit">
                {activeMarkets.map(m => (
                  <button key={m.id} type="button" onClick={() => setActiveMarketId(m.id)}
                    className={["rounded-lg px-4 py-1.5 text-sm font-medium transition-colors", activeMarketId === m.id ? "bg-indigo-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"].join(" ")}>
                    {m.name}
                  </button>
                ))}
              </div>
              {activeMarket && (
                <MarketFormulaSection
                  key={activeMarket.id}
                  marketName={activeMarket.name}
                  allIndicators={allIndicators}
                  latestCorrMap={latestCorrMap}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* ── 因子管理: CRUD for indicators + weight + corr + API + market links ── */}
      {subTab === "factors" && (
        <FactorManagementSection
          key="factor-mgmt"
          allMarkets={markets}
          latestCorrMap={latestCorrMap}
        />
      )}

      {/* ── 月度報表: view-only monthly correlation records ── */}
      {subTab === "report" && <MonthlyReportSection />}
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
// Root page
// ─────────────────────────────────────────────────────────────────────────────

const TABS = ["markets", "industries", "stocks", "asset_types", "indicators", "analysis", "api", "accounts", "permissions"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  markets: "市場管理",
  industries: "産業管理",
  stocks: "股票列表",
  asset_types: "資產管理",
  indicators: "市場指標",
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
        {tab === "asset_types" && <AssetTypesTab onReload={setAssetTypes} />}
        {tab === "indicators" && <IndicatorsTab />}
        {tab === "analysis" && <AnalysisTab markets={markets} />}
        {tab === "api" && <ApiConfigTab />}
        {tab === "accounts" && <AccountsTab />}
        {tab === "permissions" && <PermissionsTab />}
      </div>
    </main>
  );
}
