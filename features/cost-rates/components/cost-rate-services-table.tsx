"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import type { CostRateServiceRow } from "@/features/cost-rates/queries";
import { TRANSPORT_TYPE_LABEL } from "@/lib/enum-labels";
import { formatDate } from "@/lib/format";

export function CostRateServicesTable({ rows }: { rows: CostRateServiceRow[] }) {
  const columns = React.useMemo<ColumnDef<CostRateServiceRow>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Dịch vụ",
        cell: ({ row }) => (
          <Link
            href={`/admin/cost-rates/${row.original.id}`}
            className="flex flex-col"
          >
            <span className="font-medium text-primary hover:underline">
              {row.original.code}
            </span>
            <span className="text-xs text-muted-foreground">
              {row.original.name}
            </span>
          </Link>
        ),
      },
      {
        accessorKey: "transportType",
        header: "Phương thức",
        cell: ({ row }) => (
          <Badge tone={row.original.transportType === "AIR" ? "info" : "primary"}>
            {TRANSPORT_TYPE_LABEL[row.original.transportType]}
          </Badge>
        ),
      },
      {
        accessorKey: "destinationName",
        header: "Đích đến",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.destinationName + " (" + row.original.destinationCode + ")"}
          </span>
        ),
      },
      {
        accessorKey: "rateCount",
        header: "Số bậc giá",
        cell: ({ row }) =>
          row.original.rateCount > 0 ? (
            <span className="tabular-nums font-medium">{row.original.rateCount}</span>
          ) : (
            <Badge tone="neutral">{"Chưa có giá"}</Badge>
          ),
      },
      {
        accessorKey: "earliestValidFrom",
        header: "Hiệu lực từ",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.earliestValidFrom ? formatDate(row.original.earliestValidFrom) : "-"}
          </span>
        ),
      },
      {
        accessorKey: "lastUpdatedAt",
        header: "Cập nhật",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.lastUpdatedAt ? formatDate(row.original.lastUpdatedAt) : "-"}
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
      emptyTitle={"Chưa có dịch vụ"}
      emptyDescription={"Tạo dịch vụ trước khi thiết lập bảng giá."}
    />
  );
}
