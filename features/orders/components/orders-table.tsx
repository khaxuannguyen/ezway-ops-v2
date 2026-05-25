"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { MoneyDisplay } from "@/components/shared/money-display";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { PaymentStatusBadge } from "@/components/shared/payment-status-badge";
import type { OrderListRow } from "@/features/orders/queries";
import { formatDate } from "@/lib/format";

export function OrdersTable({ rows }: { rows: OrderListRow[] }) {
  const columns = React.useMemo<ColumnDef<OrderListRow>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Mã đơn",
        cell: ({ row }) => (
          <Link
            href={`/admin/orders/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: "customer.name",
        header: "Khách hàng",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.customer.name}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.customer.code}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "service.name",
        header: "Dịch vụ",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.service.name}</span>
        ),
      },
      {
        accessorKey: "salesUser.name",
        header: "Nhân viên sale",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.salesUser?.name ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "totalFeeVnd",
        header: "Tổng cước thu khách",
        cell: ({ row }) => (
          <MoneyDisplay value={row.original.totalFeeVnd} emphasis="strong" />
        ),
      },
      {
        accessorKey: "paymentStatus",
        header: "Thanh toán",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <PaymentStatusBadge status={row.original.paymentStatus} />
            {row.original.paidVnd !== row.original.totalFeeVnd ? (
              <span className="text-xs text-muted-foreground tabular-nums">
                {"Đã thu "}
                <MoneyDisplay value={row.original.paidVnd} tone="muted" />
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "profitVnd",
        header: "Lợi nhuận",
        cell: ({ row }) => (
          <MoneyDisplay
            value={row.original.profitVnd}
            tone={row.original.profitVnd >= 0 ? "positive" : "negative"}
          />
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Ngày tạo",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.createdAt)}
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
      emptyTitle={"Chưa có đơn hàng"}
      emptyDescription={"Nhấn \"Tạo đơn hàng\" để bắt đầu."}
    />
  );
}
