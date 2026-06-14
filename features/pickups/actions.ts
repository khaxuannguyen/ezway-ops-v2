"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { buildPickupCode } from "@/lib/codegen";
import {
  computePackageWeights,
  calculateOrderPackageTotals,
  priceOrder,
  type RateTier,
} from "@/lib/domain";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import type { Prisma } from "@/app/generated/prisma/client";
import type { PickupStatus } from "@/app/generated/prisma/enums";
import {
  pickupInputSchema,
  pickupStatusSchema,
  parsePickupFormData,
  parsePickupStatusFormData,
  type PickupPackageRowInput,
} from "./schemas";

/**
 * Sửa kiện hàng pickup ĐÃ gắn đơn → tự tính lại cân quy đổi của từng kiện theo
 * hệ số dịch vụ + recompute baseCostVnd/profitVnd/chargeableWeightKg của Order.
 * Giữ nguyên totalFeeVnd (cước thu khách đã chốt) — chỉ chi phí gốc đổi.
 */
async function syncOrderFromPickup(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      totalFeeVnd: true,
      extraCostTotalVnd: true,
      serviceId: true,
      service: { select: { volumetricDivisor: true } },
      pickupRequest: {
        select: {
          packages: {
            select: {
              id: true,
              actualWeightKg: true,
              lengthCm: true,
              widthCm: true,
              heightCm: true,
              quantity: true,
            },
          },
        },
      },
    },
  });
  if (!order || !order.pickupRequest || order.pickupRequest.packages.length === 0) {
    return;
  }

  const divisor = order.service.volumetricDivisor;
  const recomputed = order.pickupRequest.packages.map((p) => ({
    id: p.id,
    weights: computePackageWeights(
      {
        actualWeightKg: Number(p.actualWeightKg),
        lengthCm: p.lengthCm,
        widthCm: p.widthCm,
        heightCm: p.heightCm,
        quantity: p.quantity,
      },
      divisor
    ),
  }));

  // Cập nhật cân quy đổi của từng kiện theo divisor dịch vụ.
  for (const r of recomputed) {
    await tx.package.update({
      where: { id: r.id },
      data: {
        volumetricWeightKg: r.weights.volumetricWeightKg,
        chargeableWeightKg: r.weights.chargeableWeightKg,
      },
    });
  }

  const totals = calculateOrderPackageTotals(recomputed.map((r) => r.weights));

  const rates = await tx.serviceCostRate.findMany({
    where: { serviceId: order.serviceId },
    orderBy: { minWeightKg: "asc" },
  });
  const tiers: RateTier[] = rates.map((r) => ({
    id: r.id,
    minWeightKg: Number(r.minWeightKg),
    maxWeightKg: Number(r.maxWeightKg),
    rateType: r.rateType as RateTier["rateType"],
    amountVnd: r.amountVnd,
  }));

  let tier, baseCostVnd: number;
  try {
    ({ tier, baseCostVnd } = priceOrder(totals.totalChargeableWeight, tiers));
  } catch {
    // Không có bậc giá phù hợp — bỏ qua sync, đơn giữ số cũ.
    return;
  }

  const profitVnd = order.totalFeeVnd - baseCostVnd - order.extraCostTotalVnd;

  await tx.order.update({
    where: { id: orderId },
    data: {
      chargeableWeightKg: totals.totalChargeableWeight,
      baseRateSnapshotVnd: tier.amountVnd,
      serviceCostRateIdSnapshot: tier.id,
      baseCostVnd,
      profitVnd,
    },
  });
}

/** Ghi 1 dòng lịch sử khi trạng thái lệnh lấy hàng thay đổi (kể cả lần đầu). */
async function recordPickupStatusChange(
  tx: Prisma.TransactionClient,
  pickupRequestId: string,
  fromStatus: PickupStatus | null,
  toStatus: PickupStatus,
  byUserId: string,
  note: string | null
): Promise<void> {
  await tx.pickupStatusLog.create({
    data: { pickupRequestId, fromStatus, toStatus, byUserId, note },
  });
}

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
    const initialStatus: PickupStatus = isSale ? "PENDING" : data.currentStatus;
    const created = await prisma.$transaction(async (tx) => {
      const pickup = await tx.pickupRequest.create({
        data: {
          code,
          createdById: actor.id,
          driverId,
          currentStatus: initialStatus,
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
      // Mốc đầu của lịch sử trạng thái.
      await recordPickupStatusChange(
        tx,
        pickup.id,
        null,
        initialStatus,
        actor.id,
        null
      );
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
      // Nếu pickup đã gắn đơn → tự đồng bộ cân/cước theo divisor dịch vụ.
      if (existing.orderId) {
        await syncOrderFromPickup(tx, existing.orderId);
      }
      // Log lịch sử nếu trạng thái thực sự thay đổi.
      if (currentStatus !== existing.currentStatus) {
        await recordPickupStatusChange(
          tx,
          id,
          existing.currentStatus,
          currentStatus,
          actor.id,
          null
        );
      }
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
    // SALE chỉ tạo lệnh, không đổi trạng thái.
    if (actor.role === "SALE") {
      return {
        ok: false,
        formError: "Bạn không có quyền đổi trạng thái lệnh lấy hàng.",
      };
    }

    const existing = await prisma.pickupRequest.findUnique({
      where: { id },
      select: {
        id: true,
        currentStatus: true,
        driver: { select: { userId: true } },
      },
    });
    if (!existing) {
      return { ok: false, formError: "Không tìm thấy lệnh lấy hàng." };
    }

    const nextStatus = parsed.data.currentStatus;
    const note = normOpt(parsed.data.note);

    // DRIVER: chỉ thao tác trên lệnh được gán cho mình + theo state machine.
    if (actor.role === "DRIVER") {
      if (existing.driver?.userId !== actor.id) {
        return {
          ok: false,
          formError: "Lệnh này không được gán cho bạn.",
        };
      }
      const { canDriverTransitionTo, allowedDriverTransitions } = await import(
        "@/lib/domain/pickup-driver"
      );
      if (!canDriverTransitionTo(existing.currentStatus, nextStatus)) {
        const allowed = allowedDriverTransitions(existing.currentStatus)
          .map((t) => t.label)
          .join(", ");
        return {
          ok: false,
          formError: allowed
            ? `Không thể chuyển sang trạng thái này. Cho phép: ${allowed}.`
            : "Lệnh đã đóng, không còn thao tác.",
        };
      }
      // FAILED bắt buộc có lý do
      if (nextStatus === "FAILED" && !note) {
        return {
          ok: false,
          fieldErrors: { note: ["Vui lòng nhập lý do không lấy được hàng."] },
        };
      }
    }

    if (nextStatus === existing.currentStatus && !note) {
      // Không có gì để ghi nhận.
      return { ok: true, data: { id } };
    }

    await prisma.$transaction(async (tx) => {
      if (nextStatus !== existing.currentStatus) {
        await tx.pickupRequest.update({
          where: { id },
          data: { currentStatus: nextStatus },
        });
      }
      // Vẫn ghi log khi user nhập ghi chú dù trạng thái không đổi (vd cập nhật tình hình).
      await recordPickupStatusChange(
        tx,
        id,
        existing.currentStatus,
        nextStatus,
        actor.id,
        note
      );
    });

    revalidatePath("/admin/pickups");
    revalidatePath(`/admin/pickups/${id}`);
    revalidatePath("/driver");
    revalidatePath(`/driver/pickups/${id}`);
    return { ok: true, data: { id } };
  } catch {
    return { ok: false, formError: "Không thể cập nhật trạng thái. Vui lòng thử lại." };
  }
}

/**
 * Gán/đổi/bỏ tài xế cho 1 pickup — inline action từ detail page.
 * ADMIN/STAFF. Khi gán lần đầu (ASSIGNED → từ PENDING) → tự chuyển status
 * sang ASSIGNED + log. Khi bỏ gán → giữ status hiện tại.
 *
 * `driverId` = empty string / null → bỏ gán.
 */
export async function assignPickupDriver(
  pickupId: string,
  driverId: string | null
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("ADMIN", "STAFF");
  const nextDriverId = driverId && driverId.trim() !== "" ? driverId : null;

  const existing = await prisma.pickupRequest.findUnique({
    where: { id: pickupId },
    select: { id: true, driverId: true, currentStatus: true },
  });
  if (!existing) {
    return { ok: false, formError: "Không tìm thấy lệnh lấy hàng." };
  }

  // Validate driver tồn tại + active
  if (nextDriverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: nextDriverId },
      select: { id: true, isActive: true },
    });
    if (!driver || !driver.isActive) {
      return {
        ok: false,
        formError: "Tài xế không tồn tại hoặc đã ngưng hoạt động.",
      };
    }
  }

  if (existing.driverId === nextDriverId) {
    return { ok: true, data: { id: pickupId } };
  }

  // Auto-flip status PENDING → ASSIGNED khi gán driver lần đầu.
  const nextStatus =
    nextDriverId && existing.currentStatus === "PENDING"
      ? ("ASSIGNED" as const)
      : existing.currentStatus;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.pickupRequest.update({
        where: { id: pickupId },
        data: { driverId: nextDriverId, currentStatus: nextStatus },
      });
      if (nextStatus !== existing.currentStatus) {
        await recordPickupStatusChange(
          tx,
          pickupId,
          existing.currentStatus,
          nextStatus,
          actor.id,
          nextDriverId ? "Gán tài xế" : "Bỏ gán tài xế"
        );
      }
    });
    revalidatePath("/admin/pickups");
    revalidatePath(`/admin/pickups/${pickupId}`);
    revalidatePath("/driver");
    return { ok: true, data: { id: pickupId } };
  } catch (err) {
    console.error("assignPickupDriver", err);
    return {
      ok: false,
      formError: "Không thể gán tài xế. Vui lòng thử lại.",
    };
  }
}
