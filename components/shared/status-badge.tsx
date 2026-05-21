import * as React from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface StatusBadgeProps {
  label: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function StatusBadge({
  label,
  tone = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <Badge tone={tone} className={cn("gap-1.5", className)}>
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "neutral" && "bg-muted-foreground",
          tone === "primary" && "bg-primary",
          tone === "success" && "bg-success",
          tone === "warning" && "bg-warning",
          tone === "destructive" && "bg-destructive",
          tone === "info" && "bg-info"
        )}
      />
      {label}
    </Badge>
  );
}
