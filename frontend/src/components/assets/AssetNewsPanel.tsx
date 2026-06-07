"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { NewsArticle } from "@/lib/api/assets";

import { formatNumber, humanize } from "./format";

type AssetNewsPanelProps = {
  news: NewsArticle[];
};

function sentimentVariant(label: string) {
  if (label === "positive") return "success";
  if (label === "negative") return "destructive";
  return "secondary";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AssetNewsPanel({ news }: AssetNewsPanelProps) {
  const latestNews = [...news]
    .sort((left, right) => right.published_at.localeCompare(left.published_at))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">News</CardTitle>
        <CardDescription>最近新聞與情緒分數。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {latestNews.length === 0 ? (
          <div className="rounded-md border bg-[hsl(var(--muted))] p-4 text-sm text-[hsl(var(--muted-foreground))]">
            尚無新聞資料。
          </div>
        ) : null}
        {latestNews.map((article) => (
          <div key={article.id} className="rounded-md border p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium">{article.title}</p>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  {article.source} · {formatDate(article.published_at)}
                </p>
              </div>
              <Badge variant={sentimentVariant(article.sentiment_label)}>
                {humanize(article.sentiment_label)}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              {article.summary}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[hsl(var(--muted-foreground))]">
              <span>Sentiment {formatNumber(article.sentiment_score, 2)}</span>
              <span>Impact {formatNumber(article.impact_score, 1)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
