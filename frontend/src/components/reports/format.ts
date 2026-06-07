import type { AssetLookup, IndustryLookup } from "@/lib/api/reports";

export function num(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function money(value: number | string | null | undefined) {
  return num(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

export function percent(value: number | string | null | undefined) {
  return `${num(value).toFixed(2)}%`;
}

export function dateLabel(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("zh-TW");
}

export function dateTimeLabel(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function assetLabel(assetId: number | null | undefined, assets: AssetLookup[]) {
  if (!assetId) return "-";
  const asset = assets.find((item) => item.id === assetId);
  return asset ? `${asset.symbol} · ${asset.name}` : `Asset #${assetId}`;
}

export function industryLabel(industryId: number | null | undefined, industries: IndustryLookup[]) {
  if (!industryId) return "-";
  const industry = industries.find((item) => item.id === industryId);
  return industry?.industry_name ?? `Industry #${industryId}`;
}

export function compositeScore(winRate: number | string, avgReturn: number | string, profitFactor: number | string) {
  return num(winRate) * 0.4 + num(avgReturn) * 2 + num(profitFactor) * 10;
}
