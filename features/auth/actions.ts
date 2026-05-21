"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/action-result";
import {
  verifyPassword,
  createSessionCookie,
  clearSessionCookie,
} from "@/lib/auth";
import { loginSchema } from "./schemas";

function isNextRedirect(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

/** Đăng nhập bằng email + mật khẩu. Thành công thì chuyển vào dashboard. */
export async function login(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: (formData.get("email") ?? "").toString(),
    password: (formData.get("password") ?? "").toString(),
  });
  if (!parsed.success) {
    return { ok: false, formError: "Email hoặc mật khẩu không hợp lệ." };
  }
  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, passwordHash: true, isActive: true },
    });

    // Thông báo chung — không tiết lộ email có tồn tại hay không.
    if (!user || !user.passwordHash) {
      return { ok: false, formError: "Email hoặc mật khẩu không đúng." };
    }
    if (!user.isActive) {
      return {
        ok: false,
        formError: "Tài khoản đã bị khoá. Liên hệ quản trị viên.",
      };
    }

    const matched = await verifyPassword(password, user.passwordHash);
    if (!matched) {
      return { ok: false, formError: "Email hoặc mật khẩu không đúng." };
    }

    await createSessionCookie(user.id);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { ok: false, formError: "Đăng nhập thất bại. Vui lòng thử lại." };
  }

  redirect("/admin/dashboard");
}

/** Đăng xuất — xoá session cookie rồi về trang đăng nhập. */
export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
