"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildCustomerCode } from "@/lib/codegen";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
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

/**
 * Nhân viên sale phụ trách khách hàng:
 * - SALE → luôn gán cho chính họ.
 * - ADMIN/STAFF → dùng giá trị form; chỉ chấp nhận nếu là tài khoản SALE.
 */
async function resolveSalesOwner(
  actor: CurrentUser,
  formValue: string | undefined
): Promise<string | null> {
  if (actor.role === "SALE") return actor.id;
  const picked = (formValue ?? "").trim();
  if (!picked) return null;
  const u = await prisma.user.findUnique({
    where: { id: picked },
    select: { role: true },
  });
  return u && u.role === "SALE" ? picked : null;
}

/** Kiểm tra SĐT đã có khách hàng khác (chống đá khách qua bản ghi trùng). */
async function isPhoneTaken(
  phone: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await prisma.customer.findFirst({
    where: {
      phone,
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return existing !== null;
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
    const actor = await getCurrentUser();
    if (!actor) {
      return { ok: false, formError: "Phiên đăng nhập đã hết hạn." };
    }
    if (await isPhoneTaken(data.phone)) {
      return {
        ok: false,
        fieldErrors: {
          phone: [
            "Khách hàng với SĐT này đã tồn tại trong hệ thống. Liên hệ quản trị viên.",
          ],
        },
      };
    }

    const salesUserId = await resolveSalesOwner(actor, data.salesUserId);
    const count = await prisma.customer.count();
    const code = buildCustomerCode(count + 1);

    const created = await prisma.customer.create({
      data: {
        code,
        name: data.name,
        phone: data.phone,
        email: normEmail(data.email),
        address: data.address,
        nationalId: normOpt(data.nationalId),
        isBusiness: data.isBusiness,
        taxCode: normOpt(data.taxCode),
        notes: normOpt(data.notes),
        salesUserId,
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
    const actor = await getCurrentUser();
    if (!actor) {
      return { ok: false, formError: "Phiên đăng nhập đã hết hạn." };
    }

    const existing = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        salesUserId: true,
        deletedAt: true,
      },
    });
    if (!existing || existing.deletedAt) {
      return { ok: false, formError: "Không tìm thấy khách hàng." };
    }

    // SALE chỉ sửa khách của chính mình.
    if (actor.role === "SALE" && existing.salesUserId !== actor.id) {
      return {
        ok: false,
        formError: "Bạn không có quyền sửa khách hàng này.",
      };
    }

    // Nếu đổi SĐT — chống trùng (loại trừ chính khách đang sửa).
    if (data.phone !== existing.phone && (await isPhoneTaken(data.phone, id))) {
      return {
        ok: false,
        fieldErrors: {
          phone: [
            "Khách hàng với SĐT này đã tồn tại trong hệ thống. Liên hệ quản trị viên.",
          ],
        },
      };
    }

    // Phân quyền đổi sale phụ trách:
    // - ADMIN: lấy từ form (gỡ khoá / chuyển sale).
    // - SALE: giữ = chính mình.
    // - STAFF: giữ nguyên (không có quyền đổi sale của khách).
    let salesUserId: string | null = existing.salesUserId;
    if (actor.role === "ADMIN") {
      salesUserId = await resolveSalesOwner(actor, data.salesUserId);
    } else if (actor.role === "SALE") {
      salesUserId = actor.id;
    }

    await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        email: normEmail(data.email),
        address: data.address,
        nationalId: normOpt(data.nationalId),
        isBusiness: data.isBusiness,
        taxCode: normOpt(data.taxCode),
        notes: normOpt(data.notes),
        salesUserId,
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
