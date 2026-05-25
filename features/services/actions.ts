"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import { serviceInputSchema, parseServiceFormData } from "./schemas";

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

export async function createService(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  await requireRole("ADMIN");
  const parsed = serviceInputSchema.safeParse(parseServiceFormData(formData));
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
    const created = await prisma.shippingService.create({
      data: {
        code: data.code,
        name: data.name,
        transportType: data.transportType,
        destinationCode: data.destinationCode,
        destinationName: data.destinationName,
        volumetricDivisor: data.volumetricDivisor,
        description: normOpt(data.description),
        isActive: data.isActive,
      },
      select: { id: true },
    });

    revalidatePath("/admin/services");
    redirect(`/admin/services/${created.id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (isPrismaUniqueViolation(err)) {
      return { ok: false, fieldErrors: { code: ["Mã dịch vụ đã tồn tại."] } };
    }
    return { ok: false, formError: "Không thể lưu dịch vụ. Vui lòng thử lại." };
  }
}

export async function updateService(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  await requireRole("ADMIN");
  const parsed = serviceInputSchema.safeParse(parseServiceFormData(formData));
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
    await prisma.shippingService.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        transportType: data.transportType,
        destinationCode: data.destinationCode,
        destinationName: data.destinationName,
        volumetricDivisor: data.volumetricDivisor,
        description: normOpt(data.description),
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/services");
    revalidatePath(`/admin/services/${id}`);
    redirect(`/admin/services/${id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (isPrismaUniqueViolation(err)) {
      return { ok: false, fieldErrors: { code: ["Mã dịch vụ đã tồn tại."] } };
    }
    return { ok: false, formError: "Không thể lưu dịch vụ. Vui lòng thử lại." };
  }
}
