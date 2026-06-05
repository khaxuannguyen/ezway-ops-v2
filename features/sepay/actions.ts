"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import type { Prisma } from "@/app/generated/prisma/client";
import type { PaymentStatus, OrderStatus } from "@/app/generated/prisma/enums";

async function syncOrderPaymentTotals(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<void> {
  const [agg, order] = await Promise.all([
    tx.payment.aggregate({ where: { orderId }, _sum: { amountVnd: true } }),
    tx.order.findUnique({
      where: { id: orderId },
      select: { totalFeeVnd: true, status: true },
    }),
  ]);
  if (!order) return;
  const paidVnd = agg._sum.amountVnd ?? 0;
  let paymentStatus: PaymentStatus;
  if (paidVnd <= 0) paymentStatus = "UNPAID";
  else if (paidVnd < order.totalFeeVnd) paymentStatus = "PARTIAL";
  else paymentStatus = "PAID";
  let nextStatus: OrderStatus = order.status;
  if (paymentStatus === "PAID" && order.status === "DELIVERED") {
    nextStatus = "CLOSED";
  }
  await tx.order.update({
    where: { id: orderId },
    data: { paidVnd, paymentStatus, status: nextStatus },
  });
}

/**
 * Admin chọn SepayTransaction UNMATCHED/AMBIGUOUS → match thủ công vào 1 Order
 * cụ thể → tạo Payment auto + chuyển status MATCHED.
 */
export async function manualMatchSepayTransaction(
  sepayTxId: string,
  orderCode: string
): Promise<ActionResult<{ paymentId: string }>> {
  const actor = await requireRole("ADMIN", "STAFF");
  const code = orderCode.trim();
  if (!code) {
    return { ok: false, fieldErrors: { orderCode: ["Vui lòng nhập mã đơn."] } };
  }

  const tx = await prisma.sepayTransaction.findUnique({
    where: { id: sepayTxId },
    select: {
      id: true,
      transferType: true,
      amountVnd: true,
      content: true,
      referenceCode: true,
      transactionDate: true,
      bankBrandName: true,
      matchStatus: true,
      payment: { select: { id: true } },
    },
  });
  if (!tx) return { ok: false, formError: "Không tìm thấy giao dịch Sepay." };
  if (tx.payment) {
    return { ok: false, formError: "Giao dịch đã được match trước đó." };
  }
  if (tx.transferType !== "in" || tx.amountVnd <= 0) {
    return { ok: false, formError: "Giao dịch không hợp lệ để match." };
  }

  const order = await prisma.order.findUnique({
    where: { code },
    select: { id: true, deletedAt: true },
  });
  if (!order || order.deletedAt) {
    return { ok: false, fieldErrors: { orderCode: ["Mã đơn không tồn tại."] } };
  }

  try {
    const result = await prisma.$transaction(async (db) => {
      const payment = await db.payment.create({
        data: {
          orderId: order.id,
          amountVnd: tx.amountVnd,
          method: "BANK_TRANSFER",
          paidAt: tx.transactionDate,
          reference: tx.referenceCode,
          notes: `Manual match Sepay bởi ${actor.email}. Memo: ${tx.content}`,
          recordedById: actor.id,
          sepayTransactionId: tx.id,
        },
        select: { id: true },
      });
      await db.sepayTransaction.update({
        where: { id: tx.id },
        data: {
          matchStatus: "MATCHED",
          matchedOrderId: order.id,
          matchedAt: new Date(),
          matchNotes: `Manual match bởi ${actor.email}`,
        },
      });
      await syncOrderPaymentTotals(db, order.id);
      return { paymentId: payment.id };
    });
    revalidatePath("/admin/sepay");
    revalidatePath(`/admin/orders/${order.id}`);
    return { ok: true, data: result };
  } catch (err) {
    console.error("manualMatchSepayTransaction", err);
    return { ok: false, formError: "Không thể match giao dịch. Vui lòng thử lại." };
  }
}

/** Mark IGNORED (giao dịch không liên quan đơn nào — vd chuyển tiền cá nhân). */
export async function ignoreSepayTransaction(
  sepayTxId: string
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("ADMIN", "STAFF");
  const tx = await prisma.sepayTransaction.findUnique({
    where: { id: sepayTxId },
    select: { matchStatus: true, payment: { select: { id: true } } },
  });
  if (!tx) return { ok: false, formError: "Không tìm thấy giao dịch." };
  if (tx.payment) {
    return { ok: false, formError: "Giao dịch đã có payment, không thể bỏ qua." };
  }
  await prisma.sepayTransaction.update({
    where: { id: sepayTxId },
    data: {
      matchStatus: "IGNORED",
      matchedAt: new Date(),
      matchNotes: `Bỏ qua bởi ${actor.email}`,
    },
  });
  revalidatePath("/admin/sepay");
  return { ok: true, data: { id: sepayTxId } };
}
