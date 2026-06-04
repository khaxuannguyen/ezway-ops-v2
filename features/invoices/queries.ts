import { prisma } from "@/lib/prisma";
import type { InvoiceStatus } from "@/app/generated/prisma/enums";

export interface InvoiceRow {
  id: string;
  orderId: string;
  orderCode: string;
  customerCode: string;
  customerName: string;
  invoiceNumber: string;
  lookupCode: string | null;
  issuedAt: Date;
  totalVnd: number;
  status: InvoiceStatus;
  notes: string | null;
  recordedBy: { id: string; name: string };
  createdAt: Date;
}

export interface InvoiceByOrderRow {
  id: string;
  invoiceNumber: string;
  lookupCode: string | null;
  issuedAt: Date;
  totalVnd: number;
  status: InvoiceStatus;
  notes: string | null;
  recordedBy: { id: string; name: string };
  createdAt: Date;
}

export async function listInvoicesByOrder(
  orderId: string
): Promise<InvoiceByOrderRow[]> {
  const rows = await prisma.invoiceRecord.findMany({
    where: { orderId },
    orderBy: { issuedAt: "desc" },
    include: { recordedBy: { select: { id: true, name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    invoiceNumber: r.invoiceNumber,
    lookupCode: r.lookupCode,
    issuedAt: r.issuedAt,
    totalVnd: r.totalVnd,
    status: r.status,
    notes: r.notes,
    recordedBy: r.recordedBy,
    createdAt: r.createdAt,
  }));
}

/** List HDDT trong khoảng thời gian (cho page tracking + Excel export). */
export async function listInvoicesInPeriod(args: {
  from: Date;
  to: Date;
  status?: InvoiceStatus;
}): Promise<InvoiceRow[]> {
  const rows = await prisma.invoiceRecord.findMany({
    where: {
      issuedAt: { gte: args.from, lt: args.to },
      ...(args.status ? { status: args.status } : {}),
    },
    orderBy: { issuedAt: "desc" },
    include: {
      order: {
        select: {
          id: true,
          code: true,
          customer: { select: { code: true, name: true } },
        },
      },
      recordedBy: { select: { id: true, name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    orderId: r.order.id,
    orderCode: r.order.code,
    customerCode: r.order.customer.code,
    customerName: r.order.customer.name,
    invoiceNumber: r.invoiceNumber,
    lookupCode: r.lookupCode,
    issuedAt: r.issuedAt,
    totalVnd: r.totalVnd,
    status: r.status,
    notes: r.notes,
    recordedBy: r.recordedBy,
    createdAt: r.createdAt,
  }));
}

export interface OrderWithoutInvoiceRow {
  id: string;
  code: string;
  customerCode: string;
  customerName: string;
  totalFeeVnd: number;
  status: string;
  createdAt: Date;
}

/**
 * Danh sách đơn DELIVERED/CLOSED nhưng CHƯA có HDDT — admin xuất tiếp.
 * Dùng cho tab "Cần xuất HDDT" ở /admin/invoices.
 */
export async function listOrdersWithoutInvoice(args: {
  from?: Date;
  to?: Date;
  take?: number;
}): Promise<OrderWithoutInvoiceRow[]> {
  const rows = await prisma.order.findMany({
    where: {
      deletedAt: null,
      status: { in: ["DELIVERED", "CLOSED"] },
      invoiceRecords: { none: { status: "ISSUED" } },
      ...(args.from && args.to
        ? { createdAt: { gte: args.from, lt: args.to } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: args.take ?? 100,
    select: {
      id: true,
      code: true,
      totalFeeVnd: true,
      status: true,
      createdAt: true,
      customer: { select: { code: true, name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    customerCode: r.customer.code,
    customerName: r.customer.name,
    totalFeeVnd: r.totalFeeVnd,
    status: r.status,
    createdAt: r.createdAt,
  }));
}

/** Đếm đơn DELIVERED/CLOSED chưa xuất HDDT — badge sidebar. */
export async function countOrdersWithoutInvoice(): Promise<number> {
  return prisma.order.count({
    where: {
      deletedAt: null,
      status: { in: ["DELIVERED", "CLOSED"] },
      invoiceRecords: { none: { status: "ISSUED" } },
    },
  });
}
