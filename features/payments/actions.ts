"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import type { PaymentStatus, OrderStatus } from "@/app/generated/prisma/enums";
import type { Prisma } from "@/app/generated/prisma/client";
import { paymentInputSchema, parsePaymentFormData } from "./schemas";

/**
 * Sau mỗi create/update/delete Payment: tính lại paidVnd + paymentStatus của Order,
 * và auto-flip Order.status sang CLOSED khi đã PAID + DELIVERED.
 * Auto-flip 1 chiều — xoá payment làm tổng giảm sẽ KHÔNG revert CLOSED.
 */
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

function toFieldErrors(
  issues: readonly { path: readonly PropertyKey[]; message: string }[]
): FieldErrors {
  const fe: FieldErrors = {};
  for (const issue of issues) {
    const k = issue.path.map((p) => String(p)).join(".") || "_";
    fe[k] = fe[k] ?? [];
    fe[k].push(issue.message);
  }
  return fe;
}

function normOpt(v: string | undefined | null): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export async function createPayment(
  orderId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("ADMIN", "STAFF");

  const parsed = paymentInputSchema.safeParse(parsePaymentFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const data = parsed.data;

  // Validate đơn tồn tại.
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, deletedAt: true },
  });
  if (!order || order.deletedAt) {
    return { ok: false, formError: "Không tìm thấy đơn hàng." };
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          orderId,
          amountVnd: data.amountVnd,
          method: data.method,
          paidAt: new Date(data.paidAt),
          reference: normOpt(data.reference),
          notes: normOpt(data.notes),
          recordedById: actor.id,
        },
        select: { id: true },
      });
      await syncOrderPaymentTotals(tx, orderId);
      return p;
    });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/admin/orders`);
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    console.error("createPayment", err);
    return { ok: false, formError: "Không thể ghi nhận thanh toán." };
  }
}

export async function updatePayment(
  paymentId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  await requireRole("ADMIN", "STAFF");

  const parsed = paymentInputSchema.safeParse(parsePaymentFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const data = parsed.data;

  const existing = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, orderId: true },
  });
  if (!existing) {
    return { ok: false, formError: "Không tìm thấy payment." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          amountVnd: data.amountVnd,
          method: data.method,
          paidAt: new Date(data.paidAt),
          reference: normOpt(data.reference),
          notes: normOpt(data.notes),
        },
      });
      await syncOrderPaymentTotals(tx, existing.orderId);
    });
    revalidatePath(`/admin/orders/${existing.orderId}`);
    revalidatePath(`/admin/orders`);
    return { ok: true, data: { id: paymentId } };
  } catch (err) {
    console.error("updatePayment", err);
    return { ok: false, formError: "Không thể cập nhật thanh toán." };
  }
}

export async function deletePayment(
  paymentId: string
): Promise<ActionResult<{ orderId: string }>> {
  await requireRole("ADMIN", "STAFF");

  const existing = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, orderId: true },
  });
  if (!existing) {
    return { ok: false, formError: "Không tìm thấy payment." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id: paymentId } });
      await syncOrderPaymentTotals(tx, existing.orderId);
    });
    revalidatePath(`/admin/orders/${existing.orderId}`);
    revalidatePath(`/admin/orders`);
    return { ok: true, data: { orderId: existing.orderId } };
  } catch (err) {
    console.error("deletePayment", err);
    return { ok: false, formError: "Không thể xoá thanh toán." };
  }
}
