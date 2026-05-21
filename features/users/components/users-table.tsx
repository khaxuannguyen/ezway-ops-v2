"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import type { UserListRow } from "@/features/users/queries";
import { USER_ROLE_LABEL, USER_ROLE_TONE } from "@/lib/enum-labels";

export function UsersTable({ rows }: { rows: UserListRow[] }) {
  const columns = React.useMemo<ColumnDef<UserListRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Tài khoản",
        cell: ({ row }) => (
          <Link
            href={`/admin/users/${row.original.id}`}
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
        accessorKey: "role",
        header: "Vai trò",
        cell: ({ row }) => (
          <Badge tone={USER_ROLE_TONE[row.original.role]}>
            {USER_ROLE_LABEL[row.original.role]}
          </Badge>
        ),
      },
      {
        accessorKey: "hasPassword",
        header: "Mật khẩu",
        cell: ({ row }) =>
          row.original.hasPassword ? (
            <Badge tone="success">{"Đã đặt"}</Badge>
          ) : (
            <Badge tone="warning">{"Chưa đặt"}</Badge>
          ),
      },
      {
        accessorKey: "orderCount",
        header: "Đơn đã tạo",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {row.original.orderCount}
          </span>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Trạng thái",
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge tone="success">{"Hoạt động"}</Badge>
          ) : (
            <Badge tone="neutral">{"Đã khoá"}</Badge>
          ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      emptyTitle={"Chưa có tài khoản"}
      emptyDescription={"Nhấn Thêm tài khoản để tạo tài khoản đầu tiên."}
    />
  );
}
