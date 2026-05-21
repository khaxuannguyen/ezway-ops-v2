"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import type { StartupExpenseListRow } from "@/features/startup-expenses/queries";
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_CATEGORY_TONE,
  EXPENSE_STATUS_LABEL,
  EXPENSE_STATUS_TONE,
} from "@/lib/enum-labels";
import { formatDate } from "@/lib/format";

export function ExpensesTable({ rows }: { rows: StartupExpenseListRow[] }) {
  const columns = React.useMemo<ColumnDef<StartupExpenseListRow>[]>(
    () => [
      {
        accessorKey: "code",
        header: "ID",
        cell: ({ row }) => (
          <Link
            href={`/admin/startup-expenses/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: "itemName",
        header: "Tên khoản chi",
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.itemName}</span>
        ),
      },
      {
        accessorKey: "category",
        header: "Nhóm chi phí",
        cell: ({ row }) => (
          <Badge tone={EXPENSE_CATEGORY_TONE[row.original.category]}>
            {EXPENSE_CATEGORY_LABEL[row.original.category]}
          </Badge>
        ),
      },
      {
        accessorKey: "amountVnd",
        header: "Số tiền (VND)",
        cell: ({ row }) => (
          <MoneyDisplay value={row.original.amountVnd} emphasis="strong" />
        ),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => (
          <Badge tone={EXPENSE_STATUS_TONE[row.original.status]}>
            {EXPENSE_STATUS_LABEL[row.original.status]}
          </Badge>
        ),
      },
      {
        accessorKey: "paymentDate",
        header: "Ngày thanh toán",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.paymentDate ? formatDate(row.original.paymentDate) : "-"}
          </span>
        ),
      },
      {
        accessorKey: "paidBy",
        header: "Người thanh toán",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.paidBy ?? "-"}</span>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      emptyTitle={"Chưa có khoản chi"}
      emptyDescription={"Nhấn Thêm khoản chi để bắt đầu."}
    />
  );
}
