import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationBarProps {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
  className?: string;
  labels: {
    prev: string;
    next: string;
    summary: (from: number, to: number, total: number) => string;
  };
}

function buildHref(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  page: number
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v && k !== "page") params.set(k, v);
  }
  params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function PaginationBar({
  page,
  totalPages,
  total,
  basePath,
  searchParams,
  className,
  labels,
}: PaginationBarProps) {
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  const pageSize = total === 0 ? 0 : Math.ceil(total / totalPages);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-t border-border bg-card px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="text-muted-foreground">
        {labels.summary(from, to, total)}
      </p>
      <div className="flex items-center gap-1">
        <PageLink
          href={buildHref(basePath, searchParams, prevPage)}
          disabled={page <= 1}
          aria-label={labels.prev}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span>{labels.prev}</span>
        </PageLink>
        <span className="px-2 font-medium text-foreground">
          {page} / {totalPages}
        </span>
        <PageLink
          href={buildHref(basePath, searchParams, nextPage)}
          disabled={page >= totalPages}
          aria-label={labels.next}
        >
          <span>{labels.next}</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  disabled?: boolean;
}) {
  const cls =
    "inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs font-medium hover:bg-muted";
  if (disabled) {
    return (
      <span
        className={cn(cls, "pointer-events-none opacity-50")}
        aria-disabled
      >
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}
