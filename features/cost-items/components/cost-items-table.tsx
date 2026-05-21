"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import type { CostItemListRow } from "@/features/cost-items/queries";
import {
  COST_CATEGORY_LABEL,
  COST_CATEGORY_TONE,
  COST_PRICING_LABEL,
} from "@/lib/enum-labels";

export function CostItemsTable({ rows }: { rows: CostItemListRow[] }) {
  const columns = React.useMemo<ColumnDef<CostItemListRow>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Mã khoản chi phí",
        cell: ({ row }) => (
          <Link
            href={`/admin/cost-items/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: "name",
        header: "Tên khoản chi phí",
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "category",
        header: "Nhóm",
        cell: ({ row }) => (
          <Badge tone={COST_CATEGORY_TONE[row.original.category]}>
            {COST_CATEGORY_LABEL[row.original.category]}
          </Badge>
        ),
      },
      {
        accessorKey: "pricingType",
        header: "Kiểu tính giá",
        cell: ({ row }) => (
          <span className="text-sm">{COST_PRICING_LABEL[row.original.pricingType]}</span>
        ),
      },
      {
        accessorKey: "defaultAmountVnd",
        header: "Đơn giá mặc định (VND)",
        cell: ({ row }) => (
          <MoneyDisplay value={row.original.defaultAmountVnd ?? null} tone={row.original.defaultAmountVnd == null ? "muted" : "default"} />
        ),
      },
      {
        accessorKey: "usageCount",
        header: "Lượt áp dụng",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.usageCount}</span>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Trạng thái",
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge tone="success">{"Đang dùng"}</Badge>
          ) : (
            <Badge tone="neutral">{"Ngừng dùng"}</Badge>
          ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      emptyTitle={"Chưa có khoản chi phí"}
      emptyDescription={"Nhấn để thêm khoản chi phí đầu tiên."}
    />
  );
}
