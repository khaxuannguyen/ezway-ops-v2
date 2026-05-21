"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import type { SupplyListRow } from "@/features/supplies/queries";
import { SUPPLY_CATEGORY_LABEL, SUPPLY_CATEGORY_TONE } from "@/lib/enum-labels";

export function SuppliesTable({ rows }: { rows: SupplyListRow[] }) {
  const columns = React.useMemo<ColumnDef<SupplyListRow>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Mã vật tư",
        cell: ({ row }) => (
          <Link href={`/admin/supplies/${row.original.id}`} className="flex flex-col">
            <span className="font-medium text-primary hover:underline">
              {row.original.code}
            </span>
            <span className="text-xs text-muted-foreground">{row.original.name}</span>
          </Link>
        ),
      },
      {
        accessorKey: "category",
        header: "Nhóm",
        cell: ({ row }) => (
          <Badge tone={SUPPLY_CATEGORY_TONE[row.original.category]}>
            {SUPPLY_CATEGORY_LABEL[row.original.category]}
          </Badge>
        ),
      },
      {
        accessorKey: "currentStock",
        header: "Tồn kho",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className={"tabular-nums font-semibold " + (row.original.isLow ? "text-destructive" : "text-foreground")}>
              {row.original.currentStock.toLocaleString("vi-VN")}
            </span>
            <span className="text-xs text-muted-foreground">{row.original.unit}</span>
            {row.original.isLow ? (
              <Badge tone="destructive">{"Sắp hết"}</Badge>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "minStock",
        header: "Tối thiểu",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm text-muted-foreground">
            {row.original.minStock.toLocaleString("vi-VN")}
          </span>
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
      emptyTitle={"Chưa có vật tư"}
      emptyDescription={"Nhấn Thêm vật tư để bắt đầu."}
    />
  );
}
