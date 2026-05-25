import * as React from "react";
import { ArrowRight, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PICKUP_STATUS_LABEL, PICKUP_STATUS_TONE } from "@/lib/enum-labels";
import { formatDateTime } from "@/lib/format";
import type { PickupStatusLogRow } from "@/features/pickups/queries";

export interface PickupStatusTimelineProps {
  logs: PickupStatusLogRow[];
}

export function PickupStatusTimeline({ logs }: PickupStatusTimelineProps) {
  if (logs.length === 0) {
    return <EmptyState title={"Chưa có lịch sử trạng thái."} />;
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-6">
      {logs.map((log, i) => {
        const isLatest = i === 0;
        return (
          <li key={log.id} className="relative">
            <span
              className={
                "absolute -left-[31px] top-1 flex h-5 w-5 items-center justify-center rounded-full border " +
                (isLatest
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground")
              }
              aria-hidden
            >
              <Circle className="h-2 w-2 fill-current" />
            </span>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {log.fromStatus ? (
                <>
                  <Badge tone={PICKUP_STATUS_TONE[log.fromStatus]}>
                    {PICKUP_STATUS_LABEL[log.fromStatus]}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden />
                </>
              ) : (
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {"Tạo mới"}
                </span>
              )}
              <Badge tone={PICKUP_STATUS_TONE[log.toStatus]}>
                {PICKUP_STATUS_LABEL[log.toStatus]}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(log.at)} {"·"} {log.byUser.name}
            </p>
            {log.note ? (
              <p className="mt-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                {log.note}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
