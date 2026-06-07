"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type NotificationActionsPanelProps = {
  isChecking: boolean;
  onCheck: () => void;
  onWeeklyReport: () => void;
  onMonthlyReport: () => void;
};

export function NotificationActionsPanel({
  isChecking,
  onCheck,
  onMonthlyReport,
  onWeeklyReport,
}: NotificationActionsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Manual Actions</CardTitle>
        <CardDescription>手動檢查通知規則，或產生週報與月報通知。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          <Button disabled={isChecking} onClick={onCheck} type="button">
            Check Notifications
          </Button>
          <Button
            disabled={isChecking}
            onClick={onWeeklyReport}
            type="button"
            variant="outline"
          >
            Generate Weekly Report
          </Button>
          <Button
            disabled={isChecking}
            onClick={onMonthlyReport}
            type="button"
            variant="outline"
          >
            Generate Monthly Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
