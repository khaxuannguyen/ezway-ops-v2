import * as React from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
} from "@/lib/enum-labels";
import type { OrderStatus } from "@/app/generated/prisma/enums";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <StatusBadge
      label={ORDER_STATUS_LABEL[status]}
      tone={ORDER_STATUS_TONE[status]}
    />
  );
}
