"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { buildStartupExpenseCode } from "@/lib/codegen";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import {
  startupExpenseInputSchema,
  parseStartupExpenseFormData,
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

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const t = s.trim();
  if (t === "") return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createStartupExpense(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  await requireRole("ADMIN");
  const parsed = startupExpenseInputSchema.safeParse(
    parseStartupExpenseFormData(formData)
  );
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const data = parsed.data;

  try {
    const count = await prisma.startupExpense.count();
    const code = buildStartupExpenseCode(count + 1);

    const created = await prisma.startupExpense.create({
      data: {
        code,
        itemName: data.itemName,
        category: data.category,
        amountVnd: data.amountVnd,
        status: data.status,
        paymentDate: parseDate(data.paymentDate),
        paidBy: normOpt(data.paidBy),
        note: normOpt(data.note),
      },
      select: { id: true },
    });

    revalidatePath("/admin/startup-expenses");
    redirect(`/admin/startup-expenses/${created.id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { ok: false, formError: "Không thể lưu khoản chi. Vui lòng thử lại." };
  }
}

export async function updateStartupExpense(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  await requireRole("ADMIN");
  const parsed = startupExpenseInputSchema.safeParse(
    parseStartupExpenseFormData(formData)
  );
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const data = parsed.data;

  try {
    await prisma.startupExpense.update({
      where: { id },
      data: {
        itemName: data.itemName,
        category: data.category,
        amountVnd: data.amountVnd,
        status: data.status,
        paymentDate: parseDate(data.paymentDate),
        paidBy: normOpt(data.paidBy),
        note: normOpt(data.note),
      },
    });

    revalidatePath("/admin/startup-expenses");
    revalidatePath(`/admin/startup-expenses/${id}`);
    redirect(`/admin/startup-expenses/${id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { ok: false, formError: "Không thể lưu khoản chi. Vui lòng thử lại." };
  }
}

export async function deleteStartupExpense(id: string): Promise<void> {
  await requireRole("ADMIN");
  await prisma.startupExpense.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/admin/startup-expenses");
}
