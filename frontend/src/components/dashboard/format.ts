export function formatMoney(value: number, digits = 2) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatPercent(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`;
}

export function pnlClass(value: number) {
  if (value > 0) return "text-emerald-600 dark:text-emerald-300";
  if (value < 0) return "text-red-600 dark:text-red-300";
  return "text-[hsl(var(--foreground))]";
}

export function humanize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
