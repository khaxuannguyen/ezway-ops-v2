"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/shared/money-display";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";
import { deletePayment } from "@/features/payments/actions";
import type { PaymentMethod } from "@/app/generated/prisma/enums";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  COD: "COD",
  OTHER: "Khác",
};

export interface PaymentTableRow {
  id: string;
  amountVnd: number;
  method: PaymentMethod;
  paidAt: Date;
  reference: string | null;
  notes: string | null;
  recordedBy: { id: string; name: string };
}

export interface PaymentsTableProps {
  rows: PaymentTableRow[];
  canManage: boolean;
}

export function PaymentsTable({ rows, canManage }: PaymentsTableProps) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="p-6">
        <EmptyState title={"Chưa có khoản thanh toán nào."} />
      </div>
    );
  }

  const onDelete = async (id: string) => {
    if (!confirm("Xoá khoản thanh toán này? Tổng đã thu của đơn sẽ được tính lại.")) return;
    setPendingId(id);
    try {
      await deletePayment(id);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{"Ngày thu"}</TableHead>
          <TableHead className="text-right">{"Số tiền"}</TableHead>
          <TableHead>{"Phương thức"}</TableHead>
          <TableHead>{"Tham chiếu"}</TableHead>
          <TableHead>{"Người ghi"}</TableHead>
          {canManage ? <TableHead className="w-[80px]" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="text-sm">{formatDate(p.paidAt)}</TableCell>
            <TableCell className="text-right">
              <MoneyDisplay
                value={p.amountVnd}
                tone={p.amountVnd < 0 ? "negative" : "positive"}
                emphasis="strong"
              />
            </TableCell>
            <TableCell className="text-sm">{METHOD_LABEL[p.method]}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              <div className="flex flex-col">
                <span>{p.reference ?? "-"}</span>
                {p.notes ? (
                  <span className="text-xs">{p.notes}</span>
                ) : null}
              </div>
            </TableCell>
            <TableCell className="text-sm">{p.recordedBy.name}</TableCell>
            {canManage ? (
              <TableCell className="text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(p.id)}
                  disabled={pendingId === p.id}
                  aria-label={"Xoá"}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
