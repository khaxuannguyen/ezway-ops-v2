"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { buildPickupCode } from "@/lib/codegen";
import { computePackageWeights } from "@/lib/domain";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import {
  pickupInputSchema,
  pickupStatusSchema,
  parsePickupFormData,
  parsePickupStatusFormData,
  type PickupPackageRowInput,
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

/** Kiện hàng → bản ghi Package (cân quy đổi tạm theo hệ số mặc định 5000). */
function packageRecords(rows: PickupPackageRowInput[]) {
  return rows.map((p) => {
    const w = computePackageWeights({
      actualWeightKg: p.actualWeightKg,
      lengthCm: p.lengthCm,
      widthCm: p.widthCm,
      heightCm: p.heightCm,
    });
    return {
      description: normOpt(p.description),
      actualWeightKg: p.actualWeightKg,
      lengthCm: p.lengthCm,
      widthCm: p.widthCm,
      heightCm: p.heightCm,
      volumetricWeightKg: w.volumetricWeightKg,
      chargeableWeightKg: w.chargeableWeightKg,
    };
  });
}

async function nextPickupCode(date: Date): Promise<string> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const count = await prisma.pickupRequest.count({
    where: { createdAt: { gte: start, lt: end } },
  });
  return buildPickupCode(count + 1, date);
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
    const actor = await getCurrentUser();
    if (!actor) {
      return { ok: false, formError: "Phiên đăng nhập đã hết hạn." };
    }
    const isSale = actor.role === "SALE";

    // SALE không gán tài xế / không đặt trạng thái — ADMIN/STAFF làm.
    let driverId: string | null = null;
    if (!isSale) {
      driverId = normOpt(data.driverId);
      if (driverId) {
        const driver = await prisma.driver.findUnique({
          where: { id: driverId },
          select: { id: true },
        });
        if (!driver) {
          return {
            ok: false,
            fieldErrors: { driverId: ["Không tìm thấy tài xế."] },
          };
        }
      }
    }

    const code = await nextPickupCode(new Date());
    const created = await prisma.$transaction(async (tx) => {
      const pickup = await tx.pickupRequest.create({
        data: {
          code,
          createdById: actor.id,
          driverId,
          currentStatus: isSale ? "PENDING" : data.currentStatus,
          pickupAddress: data.pickupAddress,
          pickupContactName: data.pickupContactName,
          pickupContactPhone: data.pickupContactPhone,
          scheduledAt: parseSchedule(data.scheduledAt),
          notes: normOpt(data.notes),
        },
        select: { id: true },
      });
      await tx.package.createMany({
        data: packageRecords(data.packages).map((p) => ({
          ...p,
          pickupRequestId: pickup.id,
        })),
      });
      return pickup;
    });

    revalidatePath("/admin/pickups");
    redirect(`/admin/pickups/${created.id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
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
    const actor = await getCurrentUser();
    if (!actor) {
      return { ok: false, formError: "Phiên đăng nhập đã hết hạn." };
    }
    const isSale = actor.role === "SALE";

    const existing = await prisma.pickupRequest.findUnique({
      where: { id },
      select: {
        id: true,
        orderId: true,
        driverId: true,
        currentStatus: true,
        createdById: true,
      },
    });
    if (!existing) {
      return { ok: false, formError: "Không tìm thấy lệnh lấy hàng." };
    }
    // SALE chỉ sửa được lệnh do chính mình tạo.
    if (isSale && existing.createdById !== actor.id) {
      return {
        ok: false,
        formError: "Bạn không có quyền sửa lệnh lấy hàng này.",
      };
    }

    // SALE giữ nguyên tài xế + trạng thái; ADMIN/STAFF mới đổi được.
    let driverId: string | null;
    let currentStatus = existing.currentStatus;
    if (isSale) {
      driverId = existing.driverId;
    } else {
      driverId = normOpt(data.driverId);
      currentStatus = data.currentStatus;
      if (driverId) {
        const driver = await prisma.driver.findUnique({
          where: { id: driverId },
          select: { id: true },
        });
        if (!driver) {
          return {
            ok: false,
            fieldErrors: { driverId: ["Không tìm thấy tài xế."] },
          };
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.pickupRequest.update({
        where: { id },
        data: {
          driverId,
          currentStatus,
          pickupAddress: data.pickupAddress,
          pickupContactName: data.pickupContactName,
          pickupContactPhone: data.pickupContactPhone,
          scheduledAt: parseSchedule(data.scheduledAt),
          notes: normOpt(data.notes),
        },
      });
      // Thay toàn bộ danh sách kiện hàng.
      await tx.package.deleteMany({ where: { pickupRequestId: id } });
      await tx.package.createMany({
        data: packageRecords(data.packages).map((p) => ({
          ...p,
          pickupRequestId: id,
        })),
      });
    });

    revalidatePath("/admin/pickups");
    revalidatePath(`/admin/pickups/${id}`);
    if (existing.orderId) revalidatePath(`/admin/orders/${existing.orderId}`);
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
    const actor = await getCurrentUser();
    if (!actor) {
      return { ok: false, formError: "Phiên đăng nhập đã hết hạn." };
    }
    // Chỉ ADMIN/STAFF đổi trạng thái — SALE chỉ tạo lệnh.
    if (actor.role === "SALE") {
      return {
        ok: false,
        formError: "Bạn không có quyền đổi trạng thái lệnh lấy hàng.",
      };
    }

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
    return { ok: true, data: { id } };
  } catch {
    return { ok: false, formError: "Không thể cập nhật trạng thái. Vui lòng thử lại." };
  }
}
