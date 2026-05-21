"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import {
  costRateInputSchema,
  costRateBulkInputSchema,
  parseCostRateFormData,
  parseCostRateBulkFormData,
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

function parseValidTo(s: string | undefined): Date | null {
  if (!s) return null;
  const t = s.trim();
  if (t === "") return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createCostRate(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = costRateInputSchema.safeParse(parseCostRateFormData(formData));
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
    const service = await prisma.shippingService.findUnique({
      where: { id: data.serviceId },
      select: { id: true },
    });
    if (!service) {
      return { ok: false, fieldErrors: { serviceId: ["Vui lòng chọn dịch vụ."] } };
    }

    const created = await prisma.serviceCostRate.create({
      data: {
        serviceId: service.id,
        minWeightKg: data.minWeightKg,
        maxWeightKg: data.maxWeightKg,
        rateType: data.rateType,
        amountVnd: data.amountVnd,
        validFrom: new Date(data.validFrom),
        validTo: parseValidTo(data.validTo),
        notes: normOpt(data.notes),
      },
      select: { id: true },
    });

    void created;
    revalidatePath("/admin/cost-rates");
    revalidatePath(`/admin/cost-rates/${service.id}`);
    revalidatePath(`/admin/services/${service.id}`);
    redirect(`/admin/cost-rates/${service.id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (isPrismaUniqueViolation(err)) {
      return {
        ok: false,
        formError: "Đã tồn tại bậc giá trùng khoảng cân và ngày hiệu lực cho dịch vụ này.",
      };
    }
    return { ok: false, formError: "Không thể lưu bậc giá. Vui lòng thử lại." };
  }
}

export async function updateCostRate(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = costRateInputSchema.safeParse(parseCostRateFormData(formData));
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
    const existing = await prisma.serviceCostRate.findUnique({
      where: { id },
      select: { id: true, serviceId: true },
    });
    if (!existing) {
      return { ok: false, formError: "Không tìm thấy bậc giá." };
    }

    const service = await prisma.shippingService.findUnique({
      where: { id: data.serviceId },
      select: { id: true },
    });
    if (!service) {
      return { ok: false, fieldErrors: { serviceId: ["Vui lòng chọn dịch vụ."] } };
    }

    await prisma.serviceCostRate.update({
      where: { id },
      data: {
        serviceId: service.id,
        minWeightKg: data.minWeightKg,
        maxWeightKg: data.maxWeightKg,
        rateType: data.rateType,
        amountVnd: data.amountVnd,
        validFrom: new Date(data.validFrom),
        validTo: parseValidTo(data.validTo),
        notes: normOpt(data.notes),
      },
    });

    revalidatePath("/admin/cost-rates");
    revalidatePath(`/admin/cost-rates/${service.id}`);
    revalidatePath(`/admin/cost-rates/rate/${id}/edit`);
    revalidatePath(`/admin/services/${service.id}`);
    if (existing.serviceId !== service.id) {
      revalidatePath(`/admin/cost-rates/${existing.serviceId}`);
      revalidatePath(`/admin/services/${existing.serviceId}`);
    }
    redirect(`/admin/cost-rates/${service.id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (isPrismaUniqueViolation(err)) {
      return {
        ok: false,
        formError: "Đã tồn tại bậc giá trùng khoảng cân và ngày hiệu lực cho dịch vụ này.",
      };
    }
    return { ok: false, formError: "Không thể lưu bậc giá. Vui lòng thử lại." };
  }
}

export async function createCostRatesBulk(
  _prev: ActionResult<{ serviceId: string }> | null,
  formData: FormData
): Promise<ActionResult<{ serviceId: string }>> {
  const parsed = costRateBulkInputSchema.safeParse(
    parseCostRateBulkFormData(formData)
  );
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
    const service = await prisma.shippingService.findUnique({
      where: { id: data.serviceId },
      select: { id: true },
    });
    if (!service) {
      return { ok: false, fieldErrors: { serviceId: ["Vui lòng chọn dịch vụ."] } };
    }

    const validFrom = new Date(data.validFrom);
    const validTo = parseValidTo(data.validTo);

    const records = [
      ...data.fixedPoints.map((p) => ({
        serviceId: service.id,
        minWeightKg: p.weightKg,
        maxWeightKg: p.weightKg,
        rateType: "FIXED_TOTAL" as const,
        amountVnd: p.amountVnd,
        validFrom,
        validTo,
      })),
      ...data.perKgRows.map((r) => ({
        serviceId: service.id,
        minWeightKg: r.minWeightKg,
        maxWeightKg: r.maxWeightKg,
        rateType: "PER_KG" as const,
        amountVnd: r.amountVnd,
        validFrom,
        validTo,
      })),
    ];

    // Reject duplicate (min,max) within the submitted batch before hitting DB.
    const seen = new Set<string>();
    for (const r of records) {
      const key = `${r.minWeightKg}-${r.maxWeightKg}`;
      if (seen.has(key)) {
        return {
          ok: false,
          formError: `Trùng khoảng cân ${r.minWeightKg}-${r.maxWeightKg} kg trong bảng giá.`,
        };
      }
      seen.add(key);
    }

    await prisma.$transaction(async (tx) => {
      await tx.serviceCostRate.createMany({ data: records });
    });

    revalidatePath("/admin/cost-rates");
    revalidatePath(`/admin/cost-rates/${service.id}`);
    revalidatePath(`/admin/services/${service.id}`);
    redirect(`/admin/cost-rates/${service.id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (isPrismaUniqueViolation(err)) {
      return {
        ok: false,
        formError:
          "Đã tồn tại bậc giá trùng khoảng cân và ngày hiệu lực cho dịch vụ này. Hãy kiểm tra lại các mốc/bậc.",
      };
    }
    return { ok: false, formError: "Không thể lưu bảng giá. Vui lòng thử lại." };
  }
}

export async function replaceCostRates(
  _prev: ActionResult<{ serviceId: string }> | null,
  formData: FormData
): Promise<ActionResult<{ serviceId: string }>> {
  const parsed = costRateBulkInputSchema.safeParse(
    parseCostRateBulkFormData(formData)
  );
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
    const service = await prisma.shippingService.findUnique({
      where: { id: data.serviceId },
      select: { id: true },
    });
    if (!service) {
      return { ok: false, fieldErrors: { serviceId: ["Vui lòng chọn dịch vụ."] } };
    }

    const validFrom = new Date(data.validFrom);
    const validTo = parseValidTo(data.validTo);

    const records = [
      ...data.fixedPoints.map((p) => ({
        serviceId: service.id,
        minWeightKg: p.weightKg,
        maxWeightKg: p.weightKg,
        rateType: "FIXED_TOTAL" as const,
        amountVnd: p.amountVnd,
        validFrom,
        validTo,
      })),
      ...data.perKgRows.map((r) => ({
        serviceId: service.id,
        minWeightKg: r.minWeightKg,
        maxWeightKg: r.maxWeightKg,
        rateType: "PER_KG" as const,
        amountVnd: r.amountVnd,
        validFrom,
        validTo,
      })),
    ];

    const seen = new Set<string>();
    for (const r of records) {
      const key = `${r.minWeightKg}-${r.maxWeightKg}`;
      if (seen.has(key)) {
        return {
          ok: false,
          formError: `Trùng khoảng cân ${r.minWeightKg}-${r.maxWeightKg} kg trong bảng giá.`,
        };
      }
      seen.add(key);
    }

    await prisma.$transaction(async (tx) => {
      await tx.serviceCostRate.deleteMany({ where: { serviceId: service.id } });
      await tx.serviceCostRate.createMany({ data: records });
    });

    revalidatePath("/admin/cost-rates");
    revalidatePath(`/admin/cost-rates/${service.id}`);
    revalidatePath(`/admin/services/${service.id}`);
    redirect(`/admin/cost-rates/${service.id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (isPrismaUniqueViolation(err)) {
      return {
        ok: false,
        formError: "Trùng khoảng cân và ngày hiệu lực. Hãy kiểm tra lại các mốc/bậc.",
      };
    }
    return { ok: false, formError: "Không thể lưu bảng giá. Vui lòng thử lại." };
  }
}

export async function deleteCostRate(rateId: string): Promise<void> {
  const rate = await prisma.serviceCostRate.findUnique({
    where: { id: rateId },
    select: { id: true, serviceId: true },
  });
  if (!rate) return;

  await prisma.serviceCostRate.delete({ where: { id: rateId } });

  revalidatePath("/admin/cost-rates");
  revalidatePath(`/admin/cost-rates/${rate.serviceId}`);
  revalidatePath(`/admin/services/${rate.serviceId}`);
}
