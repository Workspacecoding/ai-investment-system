"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { IndustryFilter } from "@/lib/api/watchlist";

import { industryOptions } from "./WatchlistToolbar";

type AddAssetDialogProps = {
  open: boolean;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    market: "TW" | "US";
    symbol: string;
    name: string;
    industry: IndustryFilter;
  }) => Promise<void>;
};

export function AddAssetDialog({
  open,
  isLoading,
  onOpenChange,
  onSubmit,
}: AddAssetDialogProps) {
  const [market, setMarket] = useState<"TW" | "US">("US");
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<IndustryFilter>("ALL");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!symbol.trim()) return;

    await onSubmit({ market, symbol, name, industry });
    setSymbol("");
    setName("");
    setIndustry("ALL");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>加入自選股</DialogTitle>
        <DialogDescription>若資產不存在，系統會先建立資產再加入自選股。</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="asset-market">市場</Label>
            <Select
              id="asset-market"
              value={market}
              onChange={(event) => setMarket(event.target.value as "TW" | "US")}
            >
              <option value="TW">台股 TW</option>
              <option value="US">美股 US</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset-symbol">股票代號</Label>
            <Input
              id="asset-symbol"
              placeholder="2330 / 006208 / NVDA / TSM"
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset-name">股票名稱</Label>
            <Input
              id="asset-name"
              placeholder="可選"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset-industry">產業</Label>
            <Select
              id="asset-industry"
              value={industry}
              onChange={(event) => setIndustry(event.target.value as IndustryFilter)}
            >
              {industryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="ghost"
          >
            取消
          </Button>
          <Button disabled={isLoading || !symbol.trim()} type="submit">
            加入
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
