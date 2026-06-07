"use client";

import { create } from "zustand";

import type { AuthUser } from "@/lib/api/auth";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser, accessToken: string) => void;
  logout: () => void;
};

function setAuthCookie(accessToken: string) {
  document.cookie = `accessToken=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
}

function clearAuthCookie() {
  document.cookie = "accessToken=; path=/; max-age=0; SameSite=Lax";
}

function initialToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("accessToken");
}

function initialUser() {
  if (typeof window === "undefined") {
    return null;
  }
  const rawUser = window.localStorage.getItem("user");
  return rawUser ? (JSON.parse(rawUser) as AuthUser) : null;
}

export const useAuthStore = create<AuthState>((set) => {
  const accessToken = initialToken();
  const user = initialUser();

  return {
    user,
    accessToken,
    isAuthenticated: Boolean(accessToken && user),
    setUser: (nextUser, nextAccessToken) => {
      window.localStorage.setItem("accessToken", nextAccessToken);
      window.localStorage.setItem("user", JSON.stringify(nextUser));
      setAuthCookie(nextAccessToken);
      set({
        user: nextUser,
        accessToken: nextAccessToken,
        isAuthenticated: true,
      });
    },
    logout: () => {
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("user");
      clearAuthCookie();
      set({ user: null, accessToken: null, isAuthenticated: false });
    },
  };
});
