import { apiClient } from "@/lib/api/client";

export type NotificationType =
  | "buy_signal"
  | "take_profit"
  | "stop_loss"
  | "score_change"
  | "market_change"
  | "weekly_report"
  | "monthly_report";

export type NotificationStatus = "pending" | "sent" | "failed";

export type NotificationSettings = {
  id: number;
  user_id: number;
  email_enabled: boolean;
  email_address: string | null;
  buy_signal_enabled: boolean;
  take_profit_enabled: boolean;
  stop_loss_enabled: boolean;
  score_change_enabled: boolean;
  market_change_enabled: boolean;
  weekly_report_enabled: boolean;
  monthly_report_enabled: boolean;
  daily_send_time: string;
  timezone: string;
  created_at: string;
  updated_at: string | null;
};

export type NotificationSettingsUpdate = Partial<
  Pick<
    NotificationSettings,
    | "email_enabled"
    | "email_address"
    | "buy_signal_enabled"
    | "take_profit_enabled"
    | "stop_loss_enabled"
    | "score_change_enabled"
    | "market_change_enabled"
    | "weekly_report_enabled"
    | "monthly_report_enabled"
    | "daily_send_time"
    | "timezone"
  >
>;

export type NotificationLog = {
  id: number;
  user_id: number;
  asset_id: number | null;
  notification_type: NotificationType;
  subject: string;
  body: string;
  status: NotificationStatus;
  error_message: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
};

export async function getNotificationSettings() {
  const response = await apiClient.get<NotificationSettings>("/notifications/settings");
  return response.data;
}

export async function updateNotificationSettings(payload: NotificationSettingsUpdate) {
  const response = await apiClient.put<NotificationSettings>(
    "/notifications/settings",
    payload,
  );
  return response.data;
}

export async function getNotificationLogs() {
  const response = await apiClient.get<NotificationLog[]>("/notifications/logs");
  return response.data;
}

export async function getNotificationLog(logId: number) {
  const response = await apiClient.get<NotificationLog>(`/notifications/logs/${logId}`);
  return response.data;
}

export async function checkNotifications() {
  const response = await apiClient.post<NotificationLog[]>("/notifications/check");
  return response.data;
}

export async function generateWeeklyReportNotification() {
  const response = await apiClient.post<NotificationLog>("/notifications/weekly-report");
  return response.data;
}

export async function generateMonthlyReportNotification() {
  const response = await apiClient.post<NotificationLog>("/notifications/monthly-report");
  return response.data;
}

export async function sendNotificationLog(logId: number) {
  const response = await apiClient.post<NotificationLog>(
    `/notifications/logs/${logId}/send`,
  );
  return response.data;
}
