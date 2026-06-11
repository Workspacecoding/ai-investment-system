"use client";

import { useState } from "react";

import { changePassword, updateProfile } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-0.5 text-sm text-slate-500">{desc}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400";

export default function ProfilePage() {
  const { user, setUser, accessToken } = useAuthStore();

  // Profile form
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);
    try {
      const updated = await updateProfile({ name: name.trim() || undefined, email: email.trim() || undefined });
      // Update store
      setUser(updated, accessToken!);
      setProfileMsg({ type: "ok", text: "個人資料已更新。" });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "更新失敗，請稍後再試。";
      setProfileMsg({ type: "err", text: String(msg) });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: "err", text: "新密碼與確認密碼不符。" });
      return;
    }
    if (newPwd.length < 6) {
      setPwdMsg({ type: "err", text: "新密碼至少需要 6 個字元。" });
      return;
    }
    setPwdLoading(true);
    try {
      await changePassword({ current_password: curPwd, new_password: newPwd });
      setPwdMsg({ type: "ok", text: "密碼已成功更新。" });
      setCurPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "密碼更新失敗，請確認舊密碼是否正確。";
      setPwdMsg({ type: "err", text: String(msg) });
    } finally {
      setPwdLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">會員中心</h1>
          <p className="mt-1 text-sm text-slate-500">管理您的帳號資訊與安全設定。</p>
        </div>

        {/* Account info read-only */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xl font-bold text-white">
              {(user?.name ?? user?.email ?? "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{user?.name ?? "（未設定名稱）"}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                加入時間：{user?.created_at ? new Date(user.created_at).toLocaleDateString("zh-TW") : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Profile form */}
        <Section title="基本資料" desc="更新您的顯示名稱與電子郵件地址。">
          <form onSubmit={handleProfileSave} className="flex flex-col gap-4">
            <Field label="顯示名稱">
              <input
                className={inputCls}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="輸入您的名稱"
              />
            </Field>
            <Field label="電子郵件">
              <input
                className={inputCls}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </Field>

            {profileMsg ? (
              <p
                className={[
                  "rounded-lg px-3 py-2 text-sm",
                  profileMsg.type === "ok"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-600",
                ].join(" ")}
              >
                {profileMsg.text}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={profileLoading}
              className="self-start rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-60"
            >
              {profileLoading ? "儲存中…" : "儲存變更"}
            </button>
          </form>
        </Section>

        {/* Password form */}
        <Section title="變更密碼" desc="建議使用至少 6 位的強密碼，定期更換以保護帳號安全。">
          <form onSubmit={handlePasswordSave} className="flex flex-col gap-4">
            <Field label="目前密碼">
              <input
                className={inputCls}
                type="password"
                value={curPwd}
                onChange={(e) => setCurPwd(e.target.value)}
                placeholder="輸入目前密碼"
                autoComplete="current-password"
              />
            </Field>
            <Field label="新密碼">
              <input
                className={inputCls}
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="至少 6 個字元"
                autoComplete="new-password"
              />
            </Field>
            <Field label="確認新密碼">
              <input
                className={inputCls}
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="再次輸入新密碼"
                autoComplete="new-password"
              />
            </Field>

            {pwdMsg ? (
              <p
                className={[
                  "rounded-lg px-3 py-2 text-sm",
                  pwdMsg.type === "ok"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-600",
                ].join(" ")}
              >
                {pwdMsg.text}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pwdLoading}
              className="self-start rounded-lg bg-slate-800 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-900 disabled:opacity-60"
            >
              {pwdLoading ? "更新中…" : "更新密碼"}
            </button>
          </form>
        </Section>

        {/* Danger zone */}
        <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6">
          <h2 className="text-base font-semibold text-red-700">危險操作</h2>
          <p className="mt-1 text-sm text-red-500">登出後需重新登入才能使用系統。</p>
          <button
            type="button"
            onClick={() => {
              useAuthStore.getState().logout();
              window.location.href = "/";
            }}
            className="mt-4 rounded-lg border border-red-300 bg-white px-5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            登出帳號
          </button>
        </div>

      </div>
    </main>
  );
}
