"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { IndustryFilter, MarketFilter } from "@/lib/api/watchlist";

type WatchlistToolbarProps = {
  marketFilter: MarketFilter;
  industryFilter: IndustryFilter;
  onMarketChange: (value: MarketFilter) => void;
  onIndustryChange: (value: IndustryFilter) => void;
  onAddAsset: () => void;
};

export const industryOptions: Array<{ label: string; value: IndustryFilter }> = [
  { label: "全部", value: "ALL" },
  { label: "AI", value: "AI" },
  { label: "電子", value: "ELECTRONICS" },
  { label: "半導體", value: "SEMICONDUCTOR" },
  { label: "雲端", value: "CLOUD" },
  { label: "資料中心", value: "DATACENTER" },
];

export function marketLabel(market: string) {
  if (market === "TW") return "台股";
  if (market === "US") return "美股";
  return market;
}

export function WatchlistToolbar({
  marketFilter,
  industryFilter,
  onMarketChange,
  onIndustryChange,
  onAddAsset,
}: WatchlistToolbarProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="grid gap-3 sm:grid-cols-2 md:w-[440px]">
        <div className="space-y-2">
          <Label htmlFor="market-filter">市場</Label>
          <Select
            id="market-filter"
            value={marketFilter}
            onChange={(event) => onMarketChange(event.target.value as MarketFilter)}
          >
            <option value="ALL">全部</option>
            <option value="TW">台股 TW</option>
            <option value="US">美股 US</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="industry-filter">產業</Label>
          <Select
            id="industry-filter"
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
      </div>
      <Button onClick={onAddAsset} type="button">
        + 加入自選股
      </Button>
    </div>
  );
}
