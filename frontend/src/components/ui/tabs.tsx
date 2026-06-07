"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type TabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
};

function Tabs({ children }: TabsProps) {
  return <div className="space-y-4">{children}</div>;
}

function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex rounded-md border bg-[hsl(var(--muted))] p-1",
        className,
      )}
      {...props}
    />
  );
}

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tabValue: string;
  activeValue: string;
  onValueChange: (value: string) => void;
};

function TabsTrigger({
  className,
  tabValue,
  activeValue,
  onValueChange,
  ...props
}: TabsTriggerProps) {
  const isActive = activeValue === tabValue;
  return (
    <button
      className={cn(
        "rounded px-3 py-1.5 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors",
        isActive && "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm",
        className,
      )}
      onClick={() => onValueChange(tabValue)}
      type="button"
      {...props}
    />
  );
}

type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  tabValue: string;
  activeValue: string;
};

function TabsContent({ className, tabValue, activeValue, ...props }: TabsContentProps) {
  if (tabValue !== activeValue) return null;
  return <div className={cn("space-y-4", className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
