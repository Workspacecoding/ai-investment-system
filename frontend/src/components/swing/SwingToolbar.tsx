"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { IndustryFilter, MarketFilter } from "@/lib/api/watchlist";
import type { ConfidenceFilter, SetupTypeFilter } from "@/store/swingStore";

type SwingToolbarProps = {
  marketFilter: MarketFilter;
  industryFilter: IndustryFilter;
  confidenceFilter: ConfidenceFilter;
  setupTypeFilter: SetupTypeFilter;
  onMarketChange: (value: MarketFilter) => void;
  onIndustryChange: (value: IndustryFilter) => void;
  onConfidenceChange: (value: ConfidenceFilter) => void;
  onSetupTypeChange: (value: SetupTypeFilter) => void;
  onRefreshRanking: () => void;
};

export const industryOptions: Array<{ label: string; value: IndustryFilter }> = [
  { label: "全部", value: "ALL" },
  { label: "AI", value: "AI" },
  { label: "電子", value: "ELECTRONICS" },
  { label: "半導體", value: "SEMICONDUCTOR" },
  { label: "雲端", value: "CLOUD" },
  { label: "資料中心", value: "DATACENTER" },
];

export function setupTypeLabel(value: string) {
  if (value === "pullback") return "Pullback";
  if (value === "breakout") return "Breakout";
  if (value === "trend_follow") return "Trend Follow";
  if (value === "mean_reversion") return "Mean Reversion";
  return value;
}

export function confidenceLabel(value: string) {
  if (value === "high") return "High Confidence";
  if (value === "medium") return "Medium Confidence";
  if (value === "low") return "Low Confidence";
  return value;
}

export function marketLabel(value: string) {
  if (value === "TW") return "TW";
  if (value === "US") return "US";
  return value;
}

export function SwingToolbar({
  marketFilter,
  industryFilter,
  confidenceFilter,
  setupTypeFilter,
  onMarketChange,
  onIndustryChange,
  onConfidenceChange,
  onSetupTypeChange,
  onRefreshRanking,
}: SwingToolbarProps) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:w-[760px]">
        <div className="space-y-2">
          <Label htmlFor="swing-market">市場</Label>
          <Select
            id="swing-market"
            value={marketFilter}
            onChange={(event) => onMarketChange(event.target.value as MarketFilter)}
          >
            <option value="ALL">ALL</option>
            <option value="TW">TW</option>
            <option value="US">US</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="swing-industry">產業</Label>
          <Select
            id="swing-industry"
            value={industryFilter}
            onChange={(event) => onIndustryChange(event.target.value as IndustryFilter)}
          >
            {industryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="swing-confidence">信心</Label>
          <Select
            id="swing-confidence"
            value={confidenceFilter}
            onChange={(event) => onConfidenceChange(event.target.value as ConfidenceFilter)}
          >
            <option value="ALL">ALL</option>
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="swing-setup-type">Setup Type</Label>
          <Select
            id="swing-setup-type"
            value={setupTypeFilter}
            onChange={(event) => onSetupTypeChange(event.target.value as SetupTypeFilter)}
          >
            <option value="ALL">ALL</option>
            <option value="pullback">pullback</option>
            <option value="breakout">breakout</option>
            <option value="trend_follow">trend_follow</option>
            <option value="mean_reversion">mean_reversion</option>
          </Select>
        </div>
      </div>
      <Button onClick={onRefreshRanking} type="button" variant="outline">
        重新整理排名
      </Button>
    </div>
  );
}
