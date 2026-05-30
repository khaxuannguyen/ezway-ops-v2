"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import {
  userCreateSchema,
  userUpdateSchema,
  passwordSchema,
  parseUserFormData,
  parsePasswordFormData,
} from "./schemas";

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

function collectFieldErrors(
  issues: readonly { path: PropertyKey[]; message: string }[]
): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of issues) {
    const k = issue.path.map(String).join(".") || "_";
    fieldErrors[k] = fieldErrors[k] ?? [];
    fieldErrors[k].push(issue.message);
  }
  return fieldErrors;
}

/** Chỉ ADMIN mới được quản lý tài khoản. */
async function requireAdmin(): Promise<
  { ok: true; id: string } | { ok: false; result: ActionResult<{ id: string }> }
> {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "ADMIN") {
    return {
      ok: false,
      result: {
        ok: false,
        formError: "Bạn không có quyền quản lý tài khoản.",
      },
    };
  }
  return { ok: true, id: actor.id };
}

export async function createUser(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.result;

  const parsed = userCreateSchema.safeParse(parseUserFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error.issues) };
  }
  const data = parsed.data;
  const fromAttemptId = (formData.get("fromAttemptId") ?? "").toString().trim();

  try {
    const created = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        role: data.role,
        isActive: data.isActive,
        passwordHash: data.password
          ? await hashPassword(data.password)
          : null,
      },
      select: { id: true },
    });

    // Đánh dấu LoginAttempt nguồn (nếu có) là INVITED.
    if (fromAttemptId) {
      await prisma.loginAttempt.updateMany({
        where: { id: fromAttemptId, status: "PENDING" },
        data: {
          status: "INVITED",
          resolvedAt: new Date(),
          resolvedById: auth.id,
        },
      });
      revalidatePath("/admin/pending-invites");
    }

    revalidatePath("/admin/users");
    redirect(`/admin/users/${created.id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (isPrismaUniqueViolation(err)) {
      return { ok: false, fieldErrors: { email: ["Email đã được sử dụng."] } };
    }
    return { ok: false, formError: "Không thể tạo tài khoản. Vui lòng thử lại." };
  }
}

export async function updateUser(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.result;

  const parsed = userUpdateSchema.safeParse(parseUserFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error.issues) };
  }
  const data = parsed.data;

  try {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!existing || existing.role === "DRIVER") {
      return { ok: false, formError: "Không tìm thấy tài khoản." };
    }

    // Tự bảo vệ: không tự khoá / tự gỡ quyền admin của chính mình.
    if (id === auth.id) {
      if (!data.isActive) {
        return {
          ok: false,
          formError: "Không thể tự khoá tài khoản đang đăng nhập.",
        };
      }
      if (data.role !== "ADMIN") {
        return {
          ok: false,
          formError: "Không thể tự gỡ quyền quản trị của chính mình.",
        };
      }
    }

    await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        role: data.role,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);
    redirect(`/admin/users/${id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (isPrismaUniqueViolation(err)) {
      return { ok: false, fieldErrors: { email: ["Email đã được sử dụng."] } };
    }
    return { ok: false, formError: "Không thể lưu tài khoản. Vui lòng thử lại." };
  }
}

export async function setUserPassword(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.result;

  const parsed = passwordSchema.safeParse(parsePasswordFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error.issues) };
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!existing || existing.role === "DRIVER") {
      return { ok: false, formError: "Không tìm thấy tài khoản." };
    }

    await prisma.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    });

    revalidatePath(`/admin/users/${id}`);
    redirect(`/admin/users/${id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { ok: false, formError: "Không thể đặt mật khẩu. Vui lòng thử lại." };
  }
}
