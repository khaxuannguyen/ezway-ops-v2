"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import {
  profileSchema,
  changePasswordSchema,
  parseProfileFormData,
  parsePasswordFormData,
  type ProfileInput,
} from "./schemas";

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

function emptyToNull(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}

function dateOrNull(v: string): Date | null {
  const t = v.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Các trường hồ sơ nhân sự (dùng chung cho create + update của upsert). */
function profileFields(d: ProfileInput) {
  return {
    phone: emptyToNull(d.phone),
    address: emptyToNull(d.address),
    position: emptyToNull(d.position),
    dateOfBirth: dateOrNull(d.dateOfBirth),
    joinedAt: dateOrNull(d.joinedAt),
    emergencyContactName: emptyToNull(d.emergencyContactName),
    emergencyContactPhone: emptyToNull(d.emergencyContactPhone),
    nationalId: emptyToNull(d.nationalId),
    notes: emptyToNull(d.notes),
  };
}

/** Người dùng tự cập nhật tên + hồ sơ nhân sự của chính mình. */
export async function updateMyProfile(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!actor) {
    return { ok: false, formError: "Phiên đăng nhập đã hết hạn." };
  }

  const parsed = profileSchema.safeParse(parseProfileFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error.issues) };
  }
  const data = parsed.data;

  try {
    const fields = profileFields(data);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: actor.id },
        data: { name: data.name },
      }),
      prisma.employeeProfile.upsert({
        where: { userId: actor.id },
        create: { userId: actor.id, ...fields },
        update: fields,
      }),
    ]);

    revalidatePath("/admin/profile");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, formError: "Không thể lưu hồ sơ. Vui lòng thử lại." };
  }
}

/** Người dùng tự đổi mật khẩu — chỉ áp dụng cho tài khoản có mật khẩu. */
export async function changeMyPassword(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!actor) {
    return { ok: false, formError: "Phiên đăng nhập đã hết hạn." };
  }

  const parsed = changePasswordSchema.safeParse(parsePasswordFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error.issues) };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) {
      return {
        ok: false,
        formError: "Tài khoản này đăng nhập bằng Google, không có mật khẩu.",
      };
    }

    const matched = await verifyPassword(
      parsed.data.currentPassword,
      user.passwordHash
    );
    if (!matched) {
      return {
        ok: false,
        fieldErrors: { currentPassword: ["Mật khẩu hiện tại không đúng."] },
      };
    }

    await prisma.user.update({
      where: { id: actor.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, formError: "Không thể đổi mật khẩu. Vui lòng thử lại." };
  }
}
