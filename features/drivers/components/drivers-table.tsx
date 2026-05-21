"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import type { DriverListRow } from "@/features/drivers/queries";
import { VEHICLE_TYPE_LABEL } from "@/lib/enum-labels";

export function DriversTable({ rows }: { rows: DriverListRow[] }) {
  const columns = React.useMemo<ColumnDef<DriverListRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Tên tài xế",
        cell: ({ row }) => (
          <Link
            href={`/admin/drivers/${row.original.id}`}
            className="flex flex-col"
          >
            <span className="font-medium text-primary hover:underline">
              {row.original.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {row.original.email}
            </span>
          </Link>
        ),
      },
      {
        accessorKey: "phone",
        header: "Số điện thoại",
        cell: ({ row }) => <span className="text-sm">{row.original.phone}</span>,
      },
      {
        accessorKey: "vehicleType",
        header: "Phương tiện",
        cell: ({ row }) => (
          <div className="flex flex-col text-sm">
            <Badge tone="neutral">{VEHICLE_TYPE_LABEL[row.original.vehicleType]}</Badge>
            <span className="mt-1 text-xs text-muted-foreground">
              {row.original.vehiclePlate ?? "-"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "pickupCount",
        header: "Số lệnh lấy hàng",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">{row.original.pickupCount}</span>
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
      emptyTitle={"Chưa có tài xế"}
      emptyDescription={"Nhấn Thêm tài xế để tạo hồ sơ đầu tiên."}
    />
  );
}
