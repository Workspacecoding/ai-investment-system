"use client";

import { useEffect } from "react";

import { NotificationActionsPanel } from "@/components/notifications/NotificationActionsPanel";
import { NotificationLogsTable } from "@/components/notifications/NotificationLogsTable";
import { NotificationSettingsForm } from "@/components/notifications/NotificationSettingsForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNotificationStore } from "@/store/notificationStore";

export default function NotificationsPage() {
  const {
    checkNotifications,
    clearSelectedLog,
    error,
    fetchLog,
    fetchLogs,
    fetchSettings,
    generateMonthlyReport,
    generateWeeklyReport,
    isChecking,
    isLoading,
    isSaving,
    logs,
    selectedLog,
    sendLog,
    settings,
    updateSettings,
  } = useNotificationStore();

  useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, [fetchLogs, fetchSettings]);

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">通知中心</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            管理投資提醒、電子郵件通知、週報與月報。
          </p>
        </div>

        {error ? (
          <Alert className="border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <AlertTitle>通知中心操作失敗</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <NotificationSettingsForm
            isLoading={isLoading}
            isSaving={isSaving}
            onSave={updateSettings}
            settings={settings}
          />
          <NotificationActionsPanel
            isChecking={isChecking}
            onCheck={checkNotifications}
            onMonthlyReport={generateMonthlyReport}
            onWeeklyReport={generateWeeklyReport}
          />
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notification Logs</CardTitle>
            <CardDescription>查看通知紀錄、通知內容與 mock email 寄送狀態。</CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationLogsTable
              isLoading={isLoading}
              isSending={isChecking}
              logs={logs}
              onCloseDialog={clearSelectedLog}
              onSend={sendLog}
              onView={fetchLog}
              selectedLog={selectedLog}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
