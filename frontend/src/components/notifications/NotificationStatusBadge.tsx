import { Badge } from "@/components/ui/badge";
import type { NotificationStatus } from "@/lib/api/notifications";

const statusLabel: Record<NotificationStatus, string> = {
  pending: "Pending",
  sent: "Sent",
  failed: "Failed",
};

export function NotificationStatusBadge({ status }: { status: NotificationStatus }) {
  const variant =
    status === "sent" ? "success" : status === "failed" ? "destructive" : "warning";

  return <Badge variant={variant}>{statusLabel[status] ?? status}</Badge>;
}
