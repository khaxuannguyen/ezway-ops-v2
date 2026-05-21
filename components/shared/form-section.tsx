import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormSectionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <section
      className={cn(
        "grid gap-6 border-b border-border py-6 last:border-b-0 md:grid-cols-3",
        className
      )}
    >
      <div className="space-y-1 md:col-span-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4 md:col-span-2">{children}</div>
    </section>
  );
}
