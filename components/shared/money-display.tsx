import * as React from "react";
import { cn } from "@/lib/utils";
import { formatCurrencyVND, type NumberInput } from "@/lib/format";

export interface MoneyDisplayProps {
  value: NumberInput;
  className?: string;
  tone?: "default" | "muted" | "positive" | "negative";
  emphasis?: "normal" | "strong";
  fallback?: string;
}

const toneClasses: Record<NonNullable<MoneyDisplayProps["tone"]>, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  positive: "text-success",
  negative: "text-destructive",
};

export function MoneyDisplay({
  value,
  className,
  tone = "default",
  emphasis = "normal",
  fallback = "—",
}: MoneyDisplayProps) {
  return (
    <span
      className={cn(
        "tabular-nums",
        toneClasses[tone],
        emphasis === "strong" ? "font-semibold" : "font-medium",
        className
      )}
    >
      {formatCurrencyVND(value, fallback)}
    </span>
  );
}
