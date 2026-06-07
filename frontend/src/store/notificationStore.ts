"use client";

import { AxiosError } from "axios";
import { create } from "zustand";

import {
  checkNotifications,
  generateMonthlyReportNotification,
  generateWeeklyReportNotification,
  getNotificationLog,
  getNotificationLogs,
  getNotificationSettings,
  sendNotificationLog,
  updateNotificationSettings,
} from "@/lib/api/notifications";
import type {
  NotificationLog,
  NotificationSettings,
  NotificationSettingsUpdate,
} from "@/lib/api/notifications";

type NotificationState = {
  settings: NotificationSettings | null;
  logs: NotificationLog[];
  selectedLog: NotificationLog | null;
  isLoading: boolean;
  isSaving: boolean;
  isChecking: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (payload: NotificationSettingsUpdate) => Promise<void>;
  fetchLogs: () => Promise<void>;
  fetchLog: (logId: number) => Promise<void>;
  checkNotifications: () => Promise<void>;
  generateWeeklyReport: () => Promise<void>;
  generateMonthlyReport: () => Promise<void>;
  sendLog: (logId: number) => Promise<void>;
  clearSelectedLog: () => void;
  clearError: () => void;
};

function errorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      return "尚未登入或登入已過期。";
    }
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return "通知中心操作失敗，請稍後再試。";
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  settings: null,
  logs: [],
  selectedLog: null,
  isLoading: false,
  isSaving: false,
  isChecking: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await getNotificationSettings();
      set({ settings });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (payload) => {
    set({ isSaving: true, error: null });
    try {
      const settings = await updateNotificationSettings(payload);
      set({ settings });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  fetchLogs: async () => {
    set({ isLoading: true, error: null });
    try {
      const logs = await getNotificationLogs();
      set({ logs });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchLog: async (logId) => {
    set({ isLoading: true, error: null });
    try {
      const selectedLog = await getNotificationLog(logId);
      set({ selectedLog });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  checkNotifications: async () => {
    set({ isChecking: true, error: null });
    try {
      await checkNotifications();
      const logs = await getNotificationLogs();
      set({ logs });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isChecking: false });
    }
  },

  generateWeeklyReport: async () => {
    set({ isChecking: true, error: null });
    try {
      await generateWeeklyReportNotification();
      const logs = await getNotificationLogs();
      set({ logs });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isChecking: false });
    }
  },

  generateMonthlyReport: async () => {
    set({ isChecking: true, error: null });
    try {
      await generateMonthlyReportNotification();
      const logs = await getNotificationLogs();
      set({ logs });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isChecking: false });
    }
  },

  sendLog: async (logId) => {
    set({ isChecking: true, error: null });
    try {
      const updated = await sendNotificationLog(logId);
      set({
        logs: get().logs.map((log) => (log.id === logId ? updated : log)),
        selectedLog: get().selectedLog?.id === logId ? updated : get().selectedLog,
      });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ isChecking: false });
    }
  },

  clearSelectedLog: () => set({ selectedLog: null }),
  clearError: () => set({ error: null }),
}));
