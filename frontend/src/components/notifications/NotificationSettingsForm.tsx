"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type {
  NotificationSettings,
  NotificationSettingsUpdate,
} from "@/lib/api/notifications";

type NotificationSettingsFormProps = {
  settings: NotificationSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  onSave: (payload: NotificationSettingsUpdate) => Promise<void>;
};

type Draft = {
  email_enabled: boolean;
  email_address: string;
  buy_signal_enabled: boolean;
  take_profit_enabled: boolean;
  stop_loss_enabled: boolean;
  score_change_enabled: boolean;
  market_change_enabled: boolean;
  weekly_report_enabled: boolean;
  monthly_report_enabled: boolean;
  daily_send_time: string;
  timezone: string;
};

const emptyDraft: Draft = {
  email_enabled: true,
  email_address: "",
  buy_signal_enabled: true,
  take_profit_enabled: true,
  stop_loss_enabled: true,
  score_change_enabled: true,
  market_change_enabled: true,
  weekly_report_enabled: true,
  monthly_report_enabled: true,
  daily_send_time: "08:00:00",
  timezone: "Asia/Taipei",
};

const switches: Array<{
  key: keyof Pick<
    Draft,
    | "email_enabled"
    | "buy_signal_enabled"
    | "take_profit_enabled"
    | "stop_loss_enabled"
    | "score_change_enabled"
    | "market_change_enabled"
    | "weekly_report_enabled"
    | "monthly_report_enabled"
  >;
  label: string;
  description: string;
}> = [
  {
    key: "email_enabled",
    label: "Email Enabled",
    description: "開啟後 mock sender 會將通知標記為已寄送。",
  },
  {
    key: "buy_signal_enabled",
    label: "Buy Signal",
    description: "波段買點與交易計畫同時成立時通知。",
  },
  {
    key: "take_profit_enabled",
    label: "Take Profit",
    description: "價格達到第一目標價時通知。",
  },
  {
    key: "stop_loss_enabled",
    label: "Stop Loss",
    description: "價格跌破停損價時通知。",
  },
  {
    key: "score_change_enabled",
    label: "Score Change",
    description: "資產評分出現明顯變化時通知。",
  },
  {
    key: "market_change_enabled",
    label: "Market Change",
    description: "市場 regime 改變時通知。",
  },
  {
    key: "weekly_report_enabled",
    label: "Weekly Report",
    description: "允許產生每週摘要通知。",
  },
  {
    key: "monthly_report_enabled",
    label: "Monthly Report",
    description: "允許產生每月績效通知。",
  },
];

function toTimeInputValue(value: string) {
  return value.slice(0, 5);
}

function fromSettings(settings: NotificationSettings | null): Draft {
  if (!settings) return emptyDraft;

  return {
    email_enabled: settings.email_enabled,
    email_address: settings.email_address ?? "",
    buy_signal_enabled: settings.buy_signal_enabled,
    take_profit_enabled: settings.take_profit_enabled,
    stop_loss_enabled: settings.stop_loss_enabled,
    score_change_enabled: settings.score_change_enabled,
    market_change_enabled: settings.market_change_enabled,
    weekly_report_enabled: settings.weekly_report_enabled,
    monthly_report_enabled: settings.monthly_report_enabled,
    daily_send_time: toTimeInputValue(settings.daily_send_time),
    timezone: settings.timezone,
  };
}

export function NotificationSettingsForm({
  isLoading,
  isSaving,
  onSave,
  settings,
}: NotificationSettingsFormProps) {
  const [draft, setDraft] = useState<Draft>(() => fromSettings(settings));

  useEffect(() => {
    setDraft(fromSettings(settings));
  }, [settings]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave({
      ...draft,
      email_address: draft.email_address.trim() || null,
      daily_send_time: draft.daily_send_time,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notification Settings</CardTitle>
        <CardDescription>管理 Email、買點、停利停損、Score 異動與報表通知。</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && !settings ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-40" />
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email_address">Email Address</Label>
                <Input
                  id="email_address"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      email_address: event.target.value,
                    }))
                  }
                  placeholder="you@example.com"
                  type="email"
                  value={draft.email_address}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily_send_time">Daily Send Time</Label>
                <Input
                  id="daily_send_time"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      daily_send_time: event.target.value,
                    }))
                  }
                  type="time"
                  value={draft.daily_send_time}
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  id="timezone"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, timezone: event.target.value }))
                  }
                  value={draft.timezone}
                >
                  <option value="Asia/Taipei">Asia/Taipei</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {switches.map((item) => (
                <div
                  className="flex min-h-20 items-center justify-between gap-4 rounded-md border p-4"
                  key={item.key}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                      {item.description}
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(draft[item.key])}
                    onCheckedChange={(checked) =>
                      setDraft((current) => ({ ...current, [item.key]: checked }))
                    }
                  />
                </div>
              ))}
            </div>

            <Button disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
