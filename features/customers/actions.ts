"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildCustomerCode } from "@/lib/codegen";
import type { ActionResult } from "@/lib/action-result";
import { customerInputSchema, parseFormData } from "./schemas";

function normEmail(v: string | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function normOpt(v: string | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export async function createCustomer(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = customerInputSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join(".") || "_";
      fieldErrors[k] = fieldErrors[k] ?? [];
      fieldErrors[k].push(issue.message);
    }
    return { ok: false, fieldErrors };
  }

  const data = parsed.data;

  try {
    const count = await prisma.customer.count();
    const code = buildCustomerCode(count + 1);

    const created = await prisma.customer.create({
      data: {
        code,
        name: data.name,
        phone: data.phone,
        email: normEmail(data.email),
        address: data.address,
        isBusiness: data.isBusiness,
        taxCode: normOpt(data.taxCode),
        notes: normOpt(data.notes),
      },
      select: { id: true },
    });

    revalidatePath("/admin/customers");
    redirect(`/admin/customers/${created.id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { ok: false, formError: "Không thể lưu khách hàng. Vui lòng thử lại." };
  }
}

export async function updateCustomer(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = customerInputSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join(".") || "_";
      fieldErrors[k] = fieldErrors[k] ?? [];
      fieldErrors[k].push(issue.message);
    }
    return { ok: false, fieldErrors };
  }

  const data = parsed.data;

  try {
    await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        email: normEmail(data.email),
        address: data.address,
        isBusiness: data.isBusiness,
        taxCode: normOpt(data.taxCode),
        notes: normOpt(data.notes),
      },
    });

    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${id}`);
    redirect(`/admin/customers/${id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { ok: false, formError: "Không thể lưu khách hàng. Vui lòng thử lại." };
  }
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
