import { prisma } from "@/lib/prisma";
import type { PaymentMethod, PaymentStatus } from "@/app/generated/prisma/enums";

export interface PaymentRow {
  id: string;
  amountVnd: number;
  method: PaymentMethod;
  paidAt: Date;
  reference: string | null;
  notes: string | null;
  recordedBy: { id: string; name: string };
  createdAt: Date;
}

export async function listPaymentsByOrder(orderId: string): Promise<PaymentRow[]> {
  const rows = await prisma.payment.findMany({
    where: { orderId },
    orderBy: { paidAt: "desc" },
    include: { recordedBy: { select: { id: true, name: true } } },
  });
  return rows.map((p) => ({
    id: p.id,
    amountVnd: p.amountVnd,
    method: p.method,
    paidAt: p.paidAt,
    reference: p.reference,
    notes: p.notes,
    recordedBy: p.recordedBy,
    createdAt: p.createdAt,
  }));
}

export async function getPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: {
      recordedBy: { select: { id: true, name: true } },
      order: { select: { id: true, code: true } },
    },
  });
}

/** Tổng công nợ (chưa thu đủ) của 1 khách. Loại trừ đơn huỷ. */
export async function getCustomerDebt(customerId: string): Promise<{
  totalQuotedVnd: number;
  totalPaidVnd: number;
  debtVnd: number;
  unpaidOrders: {
    id: string;
    code: string;
    totalFeeVnd: number;
    paidVnd: number;
    paymentStatus: PaymentStatus;
    createdAt: Date;
  }[];
}> {
  const orders = await prisma.order.findMany({
    where: {
      customerId,
      deletedAt: null,
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      code: true,
      totalFeeVnd: true,
      paidVnd: true,
      paymentStatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const totalQuotedVnd = orders.reduce((s, o) => s + o.totalFeeVnd, 0);
  const totalPaidVnd = orders.reduce((s, o) => s + o.paidVnd, 0);
  const unpaidOrders = orders.filter(
    (o) => o.paymentStatus === "UNPAID" || o.paymentStatus === "PARTIAL"
  );

  return {
    totalQuotedVnd,
    totalPaidVnd,
    debtVnd: totalQuotedVnd - totalPaidVnd,
    unpaidOrders,
  };
}

/** Tổng công nợ toàn hệ thống — đơn còn nợ + chưa CLOSED/CANCELLED. */
export async function getOpenDebtTotal(): Promise<{
  debtVnd: number;
  openOrderCount: number;
}> {
  const agg = await prisma.order.aggregate({
    where: {
      deletedAt: null,
      status: { notIn: ["CANCELLED", "CLOSED"] },
      paymentStatus: { in: ["UNPAID", "PARTIAL"] },
    },
    _sum: { totalFeeVnd: true, paidVnd: true },
    _count: { _all: true },
  });
  const totalFee = agg._sum.totalFeeVnd ?? 0;
  const paid = agg._sum.paidVnd ?? 0;
  return {
    debtVnd: totalFee - paid,
    openOrderCount: agg._count._all,
  };
}
