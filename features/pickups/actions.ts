"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import {
  pickupInputSchema,
  pickupStatusSchema,
  parsePickupFormData,
  parsePickupStatusFormData,
} from "./schemas";

function normOpt(v: string | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function isNextRedirect(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    ((err as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (err as { digest: string }).digest === "NEXT_NOT_FOUND")
  );
}

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

function parseSchedule(s: string | undefined): Date | null {
  if (!s) return null;
  const t = s.trim();
  if (t === "") return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fieldErrorsFrom(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>
): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of issues) {
    const k = issue.path.map((p) => String(p)).join(".") || "_";
    fieldErrors[k] = fieldErrors[k] ?? [];
    fieldErrors[k].push(issue.message);
  }
  return fieldErrors;
}

export async function createPickup(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = pickupInputSchema.safeParse(parsePickupFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const data = parsed.data;

  try {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      select: { id: true },
    });
    if (!order) {
      return { ok: false, fieldErrors: { orderId: ["Vui lòng chọn đơn hàng."] } };
    }
    const driverId = normOpt(data.driverId);
    if (driverId) {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        select: { id: true },
      });
      if (!driver) {
        return { ok: false, fieldErrors: { driverId: ["Không tìm thấy tài xế."] } };
      }
    }

    const created = await prisma.pickupRequest.create({
      data: {
        orderId: order.id,
        driverId,
        currentStatus: data.currentStatus,
        pickupAddress: data.pickupAddress,
        pickupContactName: data.pickupContactName,
        pickupContactPhone: data.pickupContactPhone,
        scheduledAt: parseSchedule(data.scheduledAt),
        notes: normOpt(data.notes),
      },
      select: { id: true },
    });

    revalidatePath("/admin/pickups");
    revalidatePath("/admin/dashboard");
    revalidatePath(`/admin/orders/${order.id}`);
    redirect(`/admin/pickups/${created.id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (isPrismaUniqueViolation(err)) {
      return {
        ok: false,
        fieldErrors: { orderId: ["Đơn hàng này đã có lệnh lấy hàng."] },
      };
    }
    return { ok: false, formError: "Không thể lưu lệnh lấy hàng. Vui lòng thử lại." };
  }
}

export async function updatePickup(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = pickupInputSchema.safeParse(parsePickupFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const data = parsed.data;

  try {
    const existing = await prisma.pickupRequest.findUnique({
      where: { id },
      select: { id: true, orderId: true },
    });
    if (!existing) {
      return { ok: false, formError: "Không tìm thấy lệnh lấy hàng." };
    }
    const driverId = normOpt(data.driverId);
    if (driverId) {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        select: { id: true },
      });
      if (!driver) {
        return { ok: false, fieldErrors: { driverId: ["Không tìm thấy tài xế."] } };
      }
    }

    await prisma.pickupRequest.update({
      where: { id },
      data: {
        driverId,
        currentStatus: data.currentStatus,
        pickupAddress: data.pickupAddress,
        pickupContactName: data.pickupContactName,
        pickupContactPhone: data.pickupContactPhone,
        scheduledAt: parseSchedule(data.scheduledAt),
        notes: normOpt(data.notes),
      },
    });

    revalidatePath("/admin/pickups");
    revalidatePath(`/admin/pickups/${id}`);
    revalidatePath("/admin/dashboard");
    revalidatePath(`/admin/orders/${existing.orderId}`);
    redirect(`/admin/pickups/${id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { ok: false, formError: "Không thể lưu lệnh lấy hàng. Vui lòng thử lại." };
  }
}

export async function updatePickupStatus(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = pickupStatusSchema.safeParse(
    parsePickupStatusFormData(formData)
  );
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  try {
    const existing = await prisma.pickupRequest.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return { ok: false, formError: "Không tìm thấy lệnh lấy hàng." };
    }

    await prisma.pickupRequest.update({
      where: { id },
      data: { currentStatus: parsed.data.currentStatus },
    });

    revalidatePath("/admin/pickups");
    revalidatePath(`/admin/pickups/${id}`);
    revalidatePath("/admin/dashboard");
    return { ok: true, data: { id } };
  } catch {
    return { ok: false, formError: "Không thể cập nhật trạng thái. Vui lòng thử lại." };
  }
}
