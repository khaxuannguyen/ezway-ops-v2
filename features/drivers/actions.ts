"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import { driverInputSchema, parseDriverFormData } from "./schemas";

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

export async function createDriver(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  await requireRole("ADMIN", "STAFF");
  const parsed = driverInputSchema.safeParse(parseDriverFormData(formData));
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
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          role: "DRIVER",
          isActive: data.isActive,
        },
        select: { id: true },
      });
      return tx.driver.create({
        data: {
          userId: user.id,
          phone: data.phone,
          vehicleType: data.vehicleType,
          vehiclePlate: normOpt(data.vehiclePlate),
          isActive: data.isActive,
        },
        select: { id: true },
      });
    });

    revalidatePath("/admin/drivers");
    redirect(`/admin/drivers/${created.id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (isPrismaUniqueViolation(err)) {
      return { ok: false, fieldErrors: { email: ["Email đã được sử dụng."] } };
    }
    return { ok: false, formError: "Không thể lưu tài xế. Vui lòng thử lại." };
  }
}

export async function updateDriver(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  await requireRole("ADMIN", "STAFF");
  const parsed = driverInputSchema.safeParse(parseDriverFormData(formData));
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
    const existing = await prisma.driver.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!existing) {
      return { ok: false, formError: "Không tìm thấy tài xế." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          email: data.email,
          name: data.name,
          isActive: data.isActive,
        },
      });
      await tx.driver.update({
        where: { id },
        data: {
          phone: data.phone,
          vehicleType: data.vehicleType,
          vehiclePlate: normOpt(data.vehiclePlate),
          isActive: data.isActive,
        },
      });
    });

    revalidatePath("/admin/drivers");
    revalidatePath(`/admin/drivers/${id}`);
    redirect(`/admin/drivers/${id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (isPrismaUniqueViolation(err)) {
      return { ok: false, fieldErrors: { email: ["Email đã được sử dụng."] } };
    }
    return { ok: false, formError: "Không thể lưu tài xế. Vui lòng thử lại." };
  }
}
