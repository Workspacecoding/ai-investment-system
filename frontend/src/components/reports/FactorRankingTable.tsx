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
import type { FactorRanking, IndustryLookup } from "@/lib/api/reports";

import { compositeScore, industryLabel, percent } from "./format";

type FactorRankingTableProps = {
  items: FactorRanking[];
  industries: IndustryLookup[];
  isLoading: boolean;
};

export function FactorRankingTable({ industries, isLoading, items }: FactorRankingTableProps) {
  const ranked = [...items].sort((left, right) => {
    const leftRank = left.factor_rank ?? Number.MAX_SAFE_INTEGER;
    const rightRank = right.factor_rank ?? Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return (
      compositeScore(right.win_rate, right.avg_return_percent, right.profit_factor) -
      compositeScore(left.win_rate, left.avg_return_percent, left.profit_factor)
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Factor Ranking</CardTitle>
        <CardDescription>依 factor rank 與表現分數排序因子回測結果。</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && items.length === 0 ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Factor Name</TableHead>
                  <TableHead>Factor Type</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>Avg Return %</TableHead>
                  <TableHead>Profit Factor</TableHead>
                  <TableHead>Composite Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranked.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-20 text-center text-[hsl(var(--muted-foreground))]">
                      尚無因子排名資料。
                    </TableCell>
                  </TableRow>
                ) : null}
                {ranked.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={index < 3 ? "success" : "secondary"}>
                        #{item.factor_rank ?? index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.factor_name}</TableCell>
                    <TableCell>{item.factor_type}</TableCell>
                    <TableCell>{industryLabel(item.industry_id, industries)}</TableCell>
                    <TableCell>{item.market ?? "-"}</TableCell>
                    <TableCell>{percent(item.win_rate)}</TableCell>
                    <TableCell>{percent(item.avg_return_percent)}</TableCell>
                    <TableCell>{Number(item.profit_factor).toFixed(2)}</TableCell>
                    <TableCell>
                      {compositeScore(
                        item.win_rate,
                        item.avg_return_percent,
                        item.profit_factor,
                      ).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
