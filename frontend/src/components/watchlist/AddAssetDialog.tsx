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
import type { MarketOption, IndustryOption } from "./WatchlistToolbar";

type AddAssetSubmitInput = {
  market: string;
  symbol: string;
  name: string;
  industry_id: number | null;
};

type AddAssetDialogProps = {
  open: boolean;
  isLoading: boolean;
  marketOptions?: MarketOption[];
  industryOptions?: IndustryOption[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AddAssetSubmitInput) => Promise<void>;
};

export function AddAssetDialog({
  open,
  isLoading,
  marketOptions,
  industryOptions,
  onOpenChange,
  onSubmit,
}: AddAssetDialogProps) {
  const defaultMarket = marketOptions?.find(o => o.value !== "ALL")?.value ?? "TW";
  const [market, setMarket] = useState(defaultMarket);
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [industryId, setIndustryId] = useState<string>("");

  const mOpts = (marketOptions ?? []).filter(o => o.value !== "ALL");
  const iOpts = industryOptions ?? [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!symbol.trim()) return;

    await onSubmit({
      market,
      symbol,
      name,
      industry_id: industryId ? Number(industryId) : null,
    });
    setSymbol("");
    setName("");
    setIndustryId("");
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
              onChange={(event) => setMarket(event.target.value)}
            >
              {mOpts.length > 0 ? mOpts.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              )) : (
                <>
                  <option value="TW">台股 TW</option>
                  <option value="US">美股 US</option>
                </>
              )}
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
              value={industryId}
              onChange={(event) => setIndustryId(event.target.value)}
            >
              <option value="">— 不指定 —</option>
              {iOpts.filter(o => o.value !== "ALL").map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
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
