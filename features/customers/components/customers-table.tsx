"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import type { CustomerListRow } from "@/features/customers/queries";

export function CustomersTable({ rows }: { rows: CustomerListRow[] }) {
  const columns = React.useMemo<ColumnDef<CustomerListRow>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Mã khách hàng",
        cell: ({ row }) => (
          <Link
            href={`/admin/customers/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: "name",
        header: "Tên khách hàng",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {row.original.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {row.original.address}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "phone",
        header: "Số điện thoại",
        cell: ({ row }) => (
          <div className="flex flex-col text-sm">
            <span>{row.original.phone}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.email ?? "-"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "isBusiness",
        header: "Loại khách",
        cell: ({ row }) =>
          row.original.isBusiness ? (
            <Badge tone="info">{"Doanh nghiệp"}</Badge>
          ) : (
            <Badge tone="neutral">{"Cá nhân"}</Badge>
          ),
      },
      {
        accessorKey: "salesUser.name",
        header: "Nhân viên sale",
        cell: ({ row }) =>
          row.original.salesUser ? (
            <span className="text-sm">{row.original.salesUser.name}</span>
          ) : (
            <span className="text-xs text-muted-foreground">{"Chưa gán"}</span>
          ),
      },
      {
        accessorKey: "orderCount",
        header: "Đơn hàng",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {row.original.orderCount}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      emptyTitle={"Chưa có khách hàng"}
      emptyDescription={"Nhấn \"Tạo khách hàng\" để thêm hồ sơ đầu tiên."}
    />
  );
}
