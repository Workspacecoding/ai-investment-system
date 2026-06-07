"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { NotificationLog } from "@/lib/api/notifications";

import { NotificationStatusBadge } from "./NotificationStatusBadge";
import { NotificationTypeBadge } from "./NotificationTypeBadge";
import { notificationTypeLabel } from "./NotificationTypeBadge";

type NotificationLogsTableProps = {
  logs: NotificationLog[];
  selectedLog: NotificationLog | null;
  isLoading: boolean;
  isSending: boolean;
  onView: (logId: number) => void;
  onSend: (logId: number) => void;
  onCloseDialog: () => void;
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationLogsTable({
  isLoading,
  isSending,
  logs,
  onCloseDialog,
  onSend,
  onView,
  selectedLog,
}: NotificationLogsTableProps) {
  if (isLoading && logs.length === 0) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Scheduled At</TableHead>
              <TableHead>Sent At</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="min-w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell
                  className="h-24 text-center text-[hsl(var(--muted-foreground))]"
                  colSpan={8}
                >
                  尚無通知紀錄。你可以手動執行通知檢查。
                </TableCell>
              </TableRow>
            ) : null}
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <NotificationTypeBadge type={log.notification_type} />
                </TableCell>
                <TableCell className="max-w-[320px] truncate font-medium">
                  {log.subject}
                </TableCell>
                <TableCell>
                  <NotificationStatusBadge status={log.status} />
                </TableCell>
                <TableCell>{log.asset_id ? `Asset #${log.asset_id}` : "-"}</TableCell>
                <TableCell>{formatDateTime(log.scheduled_at)}</TableCell>
                <TableCell>{formatDateTime(log.sent_at)}</TableCell>
                <TableCell>{formatDateTime(log.created_at)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={isLoading}
                      onClick={() => onView(log.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      View
                    </Button>
                    {log.status === "pending" ? (
                      <Button
                        disabled={isSending}
                        onClick={() => onSend(log.id)}
                        size="sm"
                        type="button"
                      >
                        Send
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && onCloseDialog()}>
        {selectedLog ? (
          <>
            <DialogHeader>
              <DialogTitle>{selectedLog.subject}</DialogTitle>
              <DialogDescription>
                {notificationTypeLabel(selectedLog.notification_type)} ·{" "}
                {formatDateTime(selectedLog.created_at)}
              </DialogDescription>
            </DialogHeader>
            <DialogContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <NotificationTypeBadge type={selectedLog.notification_type} />
                <NotificationStatusBadge status={selectedLog.status} />
              </div>
              <div className="max-h-[45vh] overflow-y-auto whitespace-pre-wrap rounded-md border bg-[hsl(var(--muted))]/40 p-4 text-sm leading-6">
                {selectedLog.body}
              </div>
              {selectedLog.error_message ? (
                <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                  {selectedLog.error_message}
                </p>
              ) : null}
            </DialogContent>
            <DialogFooter>
              {selectedLog.status === "pending" ? (
                <Button
                  disabled={isSending}
                  onClick={() => onSend(selectedLog.id)}
                  type="button"
                >
                  Send
                </Button>
              ) : null}
              <Button onClick={onCloseDialog} type="button" variant="outline">
                Close
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </Dialog>
    </>
  );
}
