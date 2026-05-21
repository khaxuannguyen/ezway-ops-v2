"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import type { PackageListRow } from "@/features/packages/queries";

export function PackagesTable({ rows }: { rows: PackageListRow[] }) {
  const columns = React.useMemo<ColumnDef<PackageListRow>[]>(
    () => [
      {
        accessorKey: "trackingCode",
        header: "Mã vận đơn",
        cell: ({ row }) => (
          <Link
            href={`/admin/packages/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.trackingCode ?? "(chưa có) "}
          </Link>
        ),
      },
      {
        accessorKey: "order.code",
        header: "Đơn hàng",
        cell: ({ row }) => (
          <Link
            href={`/admin/orders/${row.original.order.id}`}
            className="text-sm text-primary hover:underline"
          >
            {row.original.order.code}
          </Link>
        ),
      },
      {
        accessorKey: "description",
        header: "Mô tả",
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {row.original.description ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "actualWeightKg",
        header: "Cân thực (kg)",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.actualWeightKg} kg</span>
        ),
      },
      {
        accessorKey: "volumetricWeightKg",
        header: "Cân quy đổi (kg)",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.volumetricWeightKg} kg</span>
        ),
      },
      {
        accessorKey: "chargeableWeightKg",
        header: "Cân tính cước (kg)",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">{row.original.chargeableWeightKg} kg</span>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      emptyTitle={"Chưa có kiện hàng"}
      emptyDescription={"Nhấn \"Tạo kiện hàng\" để thêm kiện đầu tiên."}
    />
  );
}
