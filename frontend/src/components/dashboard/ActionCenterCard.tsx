"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardAction } from "@/lib/api/dashboard";

type ActionCenterCardProps = {
  actions: DashboardAction[];
  isLoading: boolean;
};

function actionVariant(action: DashboardAction["action"]) {
  if (action === "BUY") return "success";
  if (action === "SELL") return "destructive";
  if (action === "WATCH") return "warning";
  return "secondary";
}

export function ActionCenterCard({ actions, isLoading }: ActionCenterCardProps) {
  if (isLoading && actions.length === 0) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">操作建議</CardTitle>
        <CardDescription>交易計畫與波段 Setup 推薦</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actions.length === 0 ? (
          <div className="rounded-md border bg-[hsl(var(--muted))] p-4 text-sm text-[hsl(var(--muted-foreground))]">
            尚無推薦操作。
          </div>
        ) : null}
        {actions.map((action) => (
          <Link
            className="rounded-md border p-4 transition-colors hover:bg-[hsl(var(--muted))]/70"
            href={`/dashboard/assets/${action.asset_id}`}
            key={`${action.asset_id}-${action.action}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{action.symbol}</p>
              <Badge variant={actionVariant(action.action)}>{action.action}</Badge>
            </div>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{action.detail}</p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
