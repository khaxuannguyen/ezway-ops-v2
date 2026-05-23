"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import type { PickupListRow } from "@/features/pickups/queries";
import { PICKUP_STATUS_LABEL, PICKUP_STATUS_TONE } from "@/lib/enum-labels";
import { formatDateTime } from "@/lib/format";

export function PickupsTable({ rows }: { rows: PickupListRow[] }) {
  const columns = React.useMemo<ColumnDef<PickupListRow>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Mã lệnh",
        cell: ({ row }) => (
          <Link
            href={`/admin/pickups/${row.original.id}`}
            className="flex flex-col"
          >
            <span className="font-medium text-primary hover:underline">
              {row.original.code}
            </span>
            <span className="text-xs text-muted-foreground">
              {row.original.order
                ? "Đơn " + row.original.order.code
                : "Chưa gắn đơn"}
            </span>
          </Link>
        ),
      },
      {
        accessorKey: "pickupContactName",
        header: "Người liên hệ",
        cell: ({ row }) => (
          <div className="flex flex-col text-sm">
            <span>{row.original.pickupContactName}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.pickupContactPhone}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "packageCount",
        header: "Số kiện",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {row.original.packageCount}
          </span>
        ),
      },
      {
        accessorKey: "driverName",
        header: "Tài xế",
        cell: ({ row }) =>
          row.original.driverName ? (
            <span className="text-sm">{row.original.driverName}</span>
          ) : (
            <Badge tone="neutral">{"Chưa phân công"}</Badge>
          ),
      },
      {
        accessorKey: "createdByName",
        header: "Người tạo",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.createdByName}
          </span>
        ),
      },
      {
        accessorKey: "scheduledAt",
        header: "Thời gian hẹn lấy",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.scheduledAt
              ? formatDateTime(row.original.scheduledAt)
              : "Chưa hẹn lịch"}
          </span>
        ),
      },
      {
        accessorKey: "currentStatus",
        header: "Trạng thái",
        cell: ({ row }) => (
          <Badge tone={PICKUP_STATUS_TONE[row.original.currentStatus]}>
            {PICKUP_STATUS_LABEL[row.original.currentStatus]}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      emptyTitle={"Chưa có lệnh lấy hàng"}
      emptyDescription={"Nhấn Tạo lệnh lấy hàng để bắt đầu."}
    />
  );
}
