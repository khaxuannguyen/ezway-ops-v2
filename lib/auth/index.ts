import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSessionCookie } from "./session";
import type { UserRole } from "@/app/generated/prisma/enums";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

/**
 * Lay user dang dang nhap tu session cookie.
 * Tra null neu chua dang nhap / session sai / tai khoan bi khoa.
 * Duoc cache theo tung request (React cache).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSessionCookie();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

/** Bat buoc dang nhap — chua dang nhap thi chuyen ve /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Bat buoc dang nhap + dung role — sai role thi ve dashboard. */
export async function requireRole(
  ...roles: UserRole[]
): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/admin/dashboard");
  return user;
}

export { hashPassword, verifyPassword } from "./password";
export {
  SESSION_COOKIE,
  decryptSession,
  createSessionCookie,
  clearSessionCookie,
  readSessionCookie,
} from "./session";
