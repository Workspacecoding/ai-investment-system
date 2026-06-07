export function numberValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatNumber(value: number | string | null | undefined, digits = 2) {
  const parsed = numberValue(value);
  if (parsed === null) return "尚無資料";
  return parsed.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatPercent(value: number | string | null | undefined, digits = 2) {
  const parsed = numberValue(value);
  if (parsed === null) return "尚無資料";
  return `${parsed.toFixed(digits)}%`;
}

export function humanize(value: string | null | undefined) {
  if (!value) return "尚無資料";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
