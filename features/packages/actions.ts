"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calculateVolumetricWeight } from "@/lib/domain";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import { packageInputSchema, parsePackageFormData } from "./schemas";

const DIVISOR = 5000;

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

function calcWeights(input: {
  actualWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}) {
  const volumetricKg = calculateVolumetricWeight(
    input.lengthCm,
    input.widthCm,
    input.heightCm,
    DIVISOR
  );
  const chargeableKg = Math.max(input.actualWeightKg, volumetricKg);
  return { volumetricKg, chargeableKg };
}

export async function createPackage(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = packageInputSchema.safeParse(parsePackageFormData(formData));
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join(".") || "_";
      fieldErrors[k] = fieldErrors[k] ?? [];
      fieldErrors[k].push(issue.message);
    }
    return { ok: false, fieldErrors };
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

    const { volumetricKg, chargeableKg } = calcWeights(data);

    const created = await prisma.package.create({
      data: {
        orderId: order.id,
        trackingCode: normOpt(data.trackingCode),
        description: normOpt(data.description),
        actualWeightKg: data.actualWeightKg,
        lengthCm: data.lengthCm,
        widthCm: data.widthCm,
        heightCm: data.heightCm,
        volumetricWeightKg: volumetricKg,
        chargeableWeightKg: chargeableKg,
      },
      select: { id: true },
    });

    revalidatePath("/admin/packages");
    revalidatePath(`/admin/orders/${order.id}`);
    revalidatePath("/admin/dashboard");
    redirect(`/admin/packages/${created.id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { ok: false, formError: "Không thể lưu kiện hàng. Vui lòng thử lại." };
  }
}

export async function updatePackage(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = packageInputSchema.safeParse(parsePackageFormData(formData));
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join(".") || "_";
      fieldErrors[k] = fieldErrors[k] ?? [];
      fieldErrors[k].push(issue.message);
    }
    return { ok: false, fieldErrors };
  }
  const data = parsed.data;

  try {
    const existing = await prisma.package.findUnique({
      where: { id },
      select: { id: true, orderId: true },
    });
    if (!existing) {
      return { ok: false, formError: "Không tìm thấy kiện hàng." };
    }

    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      select: { id: true },
    });
    if (!order) {
      return { ok: false, fieldErrors: { orderId: ["Vui lòng chọn đơn hàng."] } };
    }

    const { volumetricKg, chargeableKg } = calcWeights(data);

    await prisma.package.update({
      where: { id },
      data: {
        orderId: order.id,
        trackingCode: normOpt(data.trackingCode),
        description: normOpt(data.description),
        actualWeightKg: data.actualWeightKg,
        lengthCm: data.lengthCm,
        widthCm: data.widthCm,
        heightCm: data.heightCm,
        volumetricWeightKg: volumetricKg,
        chargeableWeightKg: chargeableKg,
      },
    });

    revalidatePath("/admin/packages");
    revalidatePath(`/admin/packages/${id}`);
    revalidatePath(`/admin/orders/${order.id}`);
    if (existing.orderId !== order.id) {
      revalidatePath(`/admin/orders/${existing.orderId}`);
    }
    revalidatePath("/admin/dashboard");
    redirect(`/admin/packages/${id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { ok: false, formError: "Không thể lưu kiện hàng. Vui lòng thử lại." };
  }
}
