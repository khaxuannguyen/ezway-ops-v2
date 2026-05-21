"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import { costItemInputSchema, parseCostItemFormData } from "./schemas";

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

function toAmount(v: unknown): number | null {
  if (v === "" || v === undefined || v === null) return null;
  if (typeof v === "number") return v;
  return null;
}

export async function createCostItem(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = costItemInputSchema.safeParse(parseCostItemFormData(formData));
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
    const created = await prisma.costItem.create({
      data: {
        code: data.code,
        name: data.name,
        category: data.category,
        pricingType: data.pricingType,
        defaultAmountVnd: toAmount(data.defaultAmountVnd),
        unitLabel: normOpt(data.unitLabel),
        description: normOpt(data.description),
        isActive: data.isActive,
      },
      select: { id: true },
    });

    revalidatePath("/admin/cost-items");
    redirect(`/admin/cost-items/${created.id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (isPrismaUniqueViolation(err)) {
      return { ok: false, fieldErrors: { code: ["Mã khoản chi phí đã tồn tại."] } };
    }
    return { ok: false, formError: "Không thể lưu khoản chi phí. Vui lòng thử lại." };
  }
}

export async function updateCostItem(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = costItemInputSchema.safeParse(parseCostItemFormData(formData));
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
    await prisma.costItem.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        category: data.category,
        pricingType: data.pricingType,
        defaultAmountVnd: toAmount(data.defaultAmountVnd),
        unitLabel: normOpt(data.unitLabel),
        description: normOpt(data.description),
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/cost-items");
    revalidatePath(`/admin/cost-items/${id}`);
    redirect(`/admin/cost-items/${id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (isPrismaUniqueViolation(err)) {
      return { ok: false, fieldErrors: { code: ["Mã khoản chi phí đã tồn tại."] } };
    }
    return { ok: false, formError: "Không thể lưu khoản chi phí. Vui lòng thử lại." };
  }
}
