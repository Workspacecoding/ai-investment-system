export function num(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoney(value: number | string | null | undefined, digits = 0) {
  return num(value).toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatPercent(value: number | string | null | undefined, digits = 2) {
  return `${num(value).toFixed(digits)}%`;
}

export function humanize(value: string | null | undefined) {
  if (!value) return "尚無資料";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
