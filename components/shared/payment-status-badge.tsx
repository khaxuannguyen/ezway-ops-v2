import * as React from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
} from "@/lib/enum-labels";
import type { PaymentStatus } from "@/app/generated/prisma/enums";

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <StatusBadge
      label={PAYMENT_STATUS_LABEL[status]}
      tone={PAYMENT_STATUS_TONE[status]}
    />
  );
}
