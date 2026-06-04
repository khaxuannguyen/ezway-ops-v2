"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import { invoiceInputSchema, parseInvoiceFormData } from "./schemas";

function fieldErrorsFrom(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>
): FieldErrors {
  const fe: FieldErrors = {};
  for (const issue of issues) {
    const k = issue.path.map((p) => String(p)).join(".") || "_";
    fe[k] = fe[k] ?? [];
    fe[k].push(issue.message);
  }
  return fe;
}

function normOpt(v: string | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export async function createInvoice(
  orderId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("ADMIN", "STAFF");

  const parsed = invoiceInputSchema.safeParse(parseInvoiceFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const data = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, deletedAt: true },
  });
  if (!order || order.deletedAt) {
    return { ok: false, formError: "Không tìm thấy đơn hàng." };
  }

  try {
    const created = await prisma.invoiceRecord.create({
      data: {
        orderId,
        invoiceNumber: data.invoiceNumber,
        lookupCode: normOpt(data.lookupCode),
        issuedAt: new Date(data.issuedAt),
        totalVnd: data.totalVnd,
        notes: normOpt(data.notes),
        recordedById: actor.id,
      },
      select: { id: true },
    });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/invoices");
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    console.error("createInvoice", err);
    return { ok: false, formError: "Không thể ghi HDDT. Vui lòng thử lại." };
  }
}

export async function updateInvoice(
  invoiceId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  await requireRole("ADMIN", "STAFF");

  const parsed = invoiceInputSchema.safeParse(parseInvoiceFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const data = parsed.data;

  const existing = await prisma.invoiceRecord.findUnique({
    where: { id: invoiceId },
    select: { id: true, orderId: true },
  });
  if (!existing) {
    return { ok: false, formError: "Không tìm thấy HDDT." };
  }

  try {
    await prisma.invoiceRecord.update({
      where: { id: invoiceId },
      data: {
        invoiceNumber: data.invoiceNumber,
        lookupCode: normOpt(data.lookupCode),
        issuedAt: new Date(data.issuedAt),
        totalVnd: data.totalVnd,
        notes: normOpt(data.notes),
      },
    });
    revalidatePath(`/admin/orders/${existing.orderId}`);
    revalidatePath("/admin/invoices");
    return { ok: true, data: { id: invoiceId } };
  } catch (err) {
    console.error("updateInvoice", err);
    return { ok: false, formError: "Không thể cập nhật HDDT." };
  }
}

export async function deleteInvoice(
  invoiceId: string
): Promise<ActionResult<{ orderId: string }>> {
  await requireRole("ADMIN", "STAFF");
  const existing = await prisma.invoiceRecord.findUnique({
    where: { id: invoiceId },
    select: { id: true, orderId: true },
  });
  if (!existing) {
    return { ok: false, formError: "Không tìm thấy HDDT." };
  }
  try {
    await prisma.invoiceRecord.delete({ where: { id: invoiceId } });
    revalidatePath(`/admin/orders/${existing.orderId}`);
    revalidatePath("/admin/invoices");
    return { ok: true, data: { orderId: existing.orderId } };
  } catch (err) {
    console.error("deleteInvoice", err);
    return { ok: false, formError: "Không thể xoá HDDT." };
  }
}

/** Đánh dấu HDDT bị huỷ (vd portal EasyInvoice huỷ). Giữ record để audit. */
export async function cancelInvoice(
  invoiceId: string
): Promise<ActionResult<{ id: string }>> {
  await requireRole("ADMIN", "STAFF");
  const existing = await prisma.invoiceRecord.findUnique({
    where: { id: invoiceId },
    select: { id: true, orderId: true, status: true },
  });
  if (!existing) {
    return { ok: false, formError: "Không tìm thấy HDDT." };
  }
  if (existing.status === "CANCELLED") {
    return { ok: false, formError: "HDDT đã bị huỷ trước đó." };
  }
  await prisma.invoiceRecord.update({
    where: { id: invoiceId },
    data: { status: "CANCELLED" },
  });
  revalidatePath(`/admin/orders/${existing.orderId}`);
  revalidatePath("/admin/invoices");
  return { ok: true, data: { id: invoiceId } };
}
