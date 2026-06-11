"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuthStore } from "@/store/authStore";

function AlphaLensLogo() {
  return (
    <svg
      aria-label="AlphaLens logo"
      fill="none"
      height="32"
      viewBox="0 0 36 36"
      width="32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="18" cy="18" r="16" stroke="#6366f1" strokeWidth="2.2" />
      <ellipse cx="18" cy="18" rx="9" ry="5.5" stroke="#6366f1" strokeWidth="1.8" />
      <circle cx="18" cy="18" r="2.8" fill="#6366f1" />
      <path
        d="M18 12.5 L20.6 9.2 L23 12.5"
        stroke="#818cf8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

const navLinks = [
  { href: "/dashboard", label: "儀表板", exact: true },
  { href: "/dashboard/watchlist", label: "自選股", exact: false },
  { href: "/dashboard/swing-center", label: "波段", exact: false },
  { href: "/dashboard/portfolio", label: "投資組合", exact: false },
  { href: "/dashboard/goal-planner", label: "目標", exact: false },
  { href: "/dashboard/reports", label: "報表", exact: false },
  { href: "/dashboard/notifications", label: "通知", exact: false, icon: "bell" },
  { href: "/dashboard/admin", label: "控制台", exact: false, icon: "cog" },
];

function BellIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" viewBox="0 0 24 24" width="16">
      <path
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg fill="none" height="14" stroke="currentColor" viewBox="0 0 24 24" width="14">
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg fill="none" height="14" stroke="currentColor" viewBox="0 0 24 24" width="14">
      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Hydration guard
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isAuth = mounted && isAuthenticated;
  const currentUser = mounted ? user : null;

  // Close user dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    setUserMenuOpen(false);
    router.push("/");
  }

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/60 bg-slate-950/90 text-white backdrop-blur-md supports-[backdrop-filter]:bg-slate-950/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link
          className="flex shrink-0 items-center gap-2 select-none"
          href={isAuth ? "/dashboard" : "/"}
        >
          <AlphaLensLogo />
          <span className="text-base font-semibold tracking-tight text-white">
            Alpha<span className="text-indigo-400">Lens</span>
          </span>
        </Link>

        {/* Desktop nav */}
        {isAuth ? (
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                  isActive(link.href, link.exact)
                    ? "bg-indigo-500/20 text-indigo-300 font-medium"
                    : "text-slate-400 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {link.icon === "bell" ? <BellIcon /> : link.icon === "cog" ? <CogIcon /> : null}
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}

        {/* Right controls */}
        <div className="hidden items-center gap-2 sm:flex">
          {isAuth ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                {/* Avatar */}
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white">
                  {(currentUser?.name ?? currentUser?.email ?? "U").charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[110px] truncate">
                  {currentUser?.name ?? currentUser?.email}
                </span>
                <ChevronDown />
              </button>

              {userMenuOpen ? (
                <div className="absolute right-0 mt-1.5 w-44 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
                  <div className="border-b border-slate-700/60 px-4 py-2.5">
                    <p className="truncate text-xs font-medium text-white">
                      {currentUser?.name ?? "用戶"}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">{currentUser?.email}</p>
                  </div>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
                  >
                    <svg fill="none" height="14" stroke="currentColor" viewBox="0 0 24 24" width="14">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    會員中心
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <svg fill="none" height="14" stroke="currentColor" viewBox="0 0 24 24" width="14">
                      <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    登出
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link
                className="rounded-md px-3 py-1.5 text-sm text-slate-400 transition-colors hover:text-white"
                href="/login"
              >
                登入
              </Link>
              <Link
                className="rounded-md bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
                href="/register"
              >
                免費註冊
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          aria-label={menuOpen ? "關閉選單" : "開啟選單"}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-white/20 text-slate-300 sm:hidden"
          onClick={() => setMenuOpen((prev) => !prev)}
          type="button"
        >
          {menuOpen ? (
            <svg fill="none" height="18" stroke="currentColor" viewBox="0 0 24 24" width="18">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeWidth="2" />
            </svg>
          ) : (
            <svg fill="none" height="18" stroke="currentColor" viewBox="0 0 24 24" width="18">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" strokeWidth="2" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen ? (
        <div className="border-t border-slate-800/60 bg-slate-950 px-4 pb-4 pt-2 sm:hidden">
          {isAuth ? (
            <>
              <p className="mb-2 truncate text-xs text-slate-400">
                {currentUser?.name ?? currentUser?.email}
              </p>
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={[
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                      isActive(link.href, link.exact)
                        ? "bg-indigo-500/20 text-indigo-300 font-medium"
                        : "text-slate-300 hover:bg-white/10 hover:text-white",
                    ].join(" ")}
                  >
                    {link.icon === "bell" ? <BellIcon /> : link.icon === "cog" ? <CogIcon /> : null}
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/dashboard/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  會員中心
                </Link>
              </nav>
              <button
                className="mt-3 w-full rounded-md border border-rose-500/30 py-2 text-sm text-rose-400 hover:bg-rose-500/10"
                onClick={handleLogout}
                type="button"
              >
                登出
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                className="w-full rounded-md border border-white/20 py-2 text-center text-sm text-white hover:bg-white/10"
                href="/login"
                onClick={() => setMenuOpen(false)}
              >
                登入
              </Link>
              <Link
                className="w-full rounded-md bg-indigo-500 py-2 text-center text-sm font-medium text-white hover:bg-indigo-600"
                href="/register"
                onClick={() => setMenuOpen(false)}
              >
                免費註冊
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </header>
  );
}
