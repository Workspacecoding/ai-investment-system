import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive";
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        variant === "default" &&
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
        variant === "secondary" &&
          "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
        variant === "success" &&
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
        variant === "warning" &&
          "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
        variant === "destructive" &&
          "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
