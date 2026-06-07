import { Badge } from "@/components/ui/badge";
import type { NotificationType } from "@/lib/api/notifications";

const typeLabel: Record<NotificationType, string> = {
  buy_signal: "Buy Signal",
  take_profit: "Take Profit",
  stop_loss: "Stop Loss",
  score_change: "Score Change",
  market_change: "Market Change",
  weekly_report: "Weekly Report",
  monthly_report: "Monthly Report",
};

export function notificationTypeLabel(type: NotificationType) {
  return typeLabel[type] ?? type;
}

export function NotificationTypeBadge({ type }: { type: NotificationType }) {
  const variant =
    type === "buy_signal" || type === "take_profit"
      ? "success"
      : type === "stop_loss"
        ? "destructive"
        : type === "market_change" || type === "score_change"
          ? "warning"
          : "secondary";

  return <Badge variant={variant}>{notificationTypeLabel(type)}</Badge>;
}
