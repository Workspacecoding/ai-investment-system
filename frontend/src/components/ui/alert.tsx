import * as React from "react";

import { cn } from "@/lib/utils";

function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md border bg-[hsl(var(--card))] p-4 text-sm text-[hsl(var(--card-foreground))]",
        className,
      )}
      role="alert"
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("mb-1 font-medium", className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[hsl(var(--muted-foreground))]", className)} {...props} />;
}

export { Alert, AlertDescription, AlertTitle };
