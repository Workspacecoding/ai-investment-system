"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { IndustryFilter, MarketFilter } from "@/lib/api/watchlist";

export type MarketOption = { label: string; value: string };
export type IndustryOption = { label: string; value: string };

type WatchlistToolbarProps = {
  marketFilter: MarketFilter;
  industryFilter: IndustryFilter;
  marketOptions?: MarketOption[];
  industryOptions?: IndustryOption[];
  onMarketChange: (value: MarketFilter) => void;
  onIndustryChange: (value: IndustryFilter) => void;
  onAddAsset: () => void;
};

export function marketLabel(market: string) {
  if (market === "TW") return "台股";
  if (market === "US") return "美股";
  return market;
}

const DEFAULT_MARKET_OPTIONS: MarketOption[] = [
  { label: "全部", value: "ALL" },
  { label: "台股 TW", value: "TW" },
  { label: "美股 US", value: "US" },
];

const DEFAULT_INDUSTRY_OPTIONS: IndustryOption[] = [
  { label: "全部", value: "ALL" },
];

export function WatchlistToolbar({
  marketFilter,
  industryFilter,
  marketOptions,
  industryOptions,
  onMarketChange,
  onIndustryChange,
  onAddAsset,
}: WatchlistToolbarProps) {
  const mOpts = marketOptions && marketOptions.length > 0 ? marketOptions : DEFAULT_MARKET_OPTIONS;
  const iOpts = industryOptions && industryOptions.length > 0 ? industryOptions : DEFAULT_INDUSTRY_OPTIONS;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="grid gap-3 sm:grid-cols-2 md:w-[440px]">
        <div className="space-y-2">
          <Label htmlFor="market-filter">市場</Label>
          <Select
            id="market-filter"
            value={marketFilter}
            onChange={(event) => onMarketChange(event.target.value)}
          >
            {mOpts.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="industry-filter">產業</Label>
          <Select
            id="industry-filter"
            value={industryFilter}
            onChange={(event) => onIndustryChange(event.target.value)}
          >
            {iOpts.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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
