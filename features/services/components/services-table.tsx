"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import type { ServiceListRow } from "@/features/services/queries";
import { TRANSPORT_TYPE_LABEL } from "@/lib/enum-labels";

export function ServicesTable({ rows }: { rows: ServiceListRow[] }) {
  const columns = React.useMemo<ColumnDef<ServiceListRow>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Mã dịch vụ",
        cell: ({ row }) => (
          <Link
            href={`/admin/services/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: "name",
        header: "Tên dịch vụ",
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "transportType",
        header: "Phương thức vận chuyển",
        cell: ({ row }) => (
          <Badge tone={row.original.transportType === "AIR" ? "info" : "primary"}>
            {TRANSPORT_TYPE_LABEL[row.original.transportType]}
          </Badge>
        ),
      },
      {
        accessorKey: "destinationName",
        header: "Tên đích đến",
        cell: ({ row }) => (
          <div className="flex flex-col text-sm">
            <span className="font-medium">{row.original.destinationName}</span>
            <span className="text-xs text-muted-foreground">{row.original.destinationCode}</span>
          </div>
        ),
      },
      {
        accessorKey: "rateCount",
        header: "Bậc giá",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">{row.original.rateCount}</span>
        ),
      },
      {
        accessorKey: "orderCount",
        header: "Đơn hàng",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.orderCount}</span>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Trạng thái",
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge tone="success">{"Hoạt động"}</Badge>
          ) : (
            <Badge tone="neutral">{"Tạm ngưng"}</Badge>
          ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      emptyTitle={"Chưa có dịch vụ"}
      emptyDescription={"Nhấn để thêm dịch vụ đầu tiên."}
    />
  );
}
