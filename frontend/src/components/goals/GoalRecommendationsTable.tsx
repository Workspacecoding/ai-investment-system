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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GoalStrategyRecommendation } from "@/lib/api/goals";

import { formatPercent } from "./format";

type GoalRecommendationsTableProps = {
  recommendations: GoalStrategyRecommendation[];
};

export function GoalRecommendationsTable({ recommendations }: GoalRecommendationsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recommended Assets</CardTitle>
        <CardDescription>目標策略推薦配置標的。</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Recommendation Type</TableHead>
              <TableHead>Allocation %</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recommendations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-[hsl(var(--muted-foreground))]"
                >
                  尚無推薦標的。
                </TableCell>
              </TableRow>
            ) : null}
            {recommendations.map((recommendation) => (
              <TableRow key={recommendation.id}>
                <TableCell className="font-medium">
                  <Link
                    className="hover:underline"
                    href={`/dashboard/assets/${recommendation.asset_id}`}
                  >
                    {recommendation.symbol}
                  </Link>
                </TableCell>
                <TableCell>{recommendation.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{recommendation.recommendation_type}</Badge>
                </TableCell>
                <TableCell>{formatPercent(recommendation.allocation_percent)}</TableCell>
                <TableCell className="max-w-lg text-[hsl(var(--muted-foreground))]">
                  {recommendation.reason}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
