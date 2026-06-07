import * as React from "react";

import { cn } from "@/lib/utils";

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value: number;
};

function Progress({ className, value, ...props }: ProgressProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]", className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-[hsl(var(--primary))] transition-all"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

export { Progress };
