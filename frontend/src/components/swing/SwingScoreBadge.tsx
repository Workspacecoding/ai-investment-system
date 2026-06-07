"use client";

import { Badge } from "@/components/ui/badge";

type SwingScoreBadgeProps = {
  score: number | string;
};

export function scoreLevel(score: number | string) {
  const value = Number(score);
  if (value >= 80) return "High";
  if (value >= 60) return "Medium";
  return "Low";
}

export function SwingScoreBadge({ score }: SwingScoreBadgeProps) {
  const level = scoreLevel(score);

  return (
    <Badge
      variant={level === "High" ? "success" : level === "Medium" ? "warning" : "secondary"}
    >
      {level} {Number(score).toFixed(1)}
    </Badge>
  );
}
