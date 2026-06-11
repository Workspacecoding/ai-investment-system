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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardOpportunity } from "@/lib/api/dashboard";

type TopOpportunitiesCardProps = {
  opportunities: DashboardOpportunity[];
  isLoading: boolean;
};

export function TopOpportunitiesCard({ opportunities, isLoading }: TopOpportunitiesCardProps) {
  if (isLoading && opportunities.length === 0) return <Skeleton className="h-80 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">今日波段機會</CardTitle>
        <CardDescription>波段交易排名前 5 名</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>代碼</TableHead>
              <TableHead>分數</TableHead>
              <TableHead>波段分數</TableHead>
              <TableHead>進場區間</TableHead>
              <TableHead>信心度</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {opportunities.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-[hsl(var(--muted-foreground))]"
                >
                  尚無今日機會。
                </TableCell>
              </TableRow>
            ) : null}
            {opportunities.map((item) => (
              <TableRow key={item.asset_id}>
                <TableCell className="font-medium">
                  <Link className="hover:underline" href={`/dashboard/assets/${item.asset_id}`}>
                    {item.symbol}
                  </Link>
                </TableCell>
                <TableCell>{item.score.toFixed(1)}</TableCell>
                <TableCell>{item.swing_score.toFixed(1)}</TableCell>
                <TableCell>{item.entry_zone}</TableCell>
                <TableCell>
                  <Badge variant={item.confidence === "high" ? "success" : "secondary"}>
                    {item.confidence}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
