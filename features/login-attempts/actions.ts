"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";

/** Đánh dấu attempt là IGNORED (email lạ, không phải nhân viên). */
export async function ignoreLoginAttempt(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("ADMIN");
  const existing = await prisma.loginAttempt.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) {
    return { ok: false, formError: "Không tìm thấy yêu cầu." };
  }
  if (existing.status !== "PENDING") {
    return { ok: false, formError: "Yêu cầu đã được xử lý." };
  }
  await prisma.loginAttempt.update({
    where: { id },
    data: {
      status: "IGNORED",
      resolvedAt: new Date(),
      resolvedById: actor.id,
    },
  });
  revalidatePath("/admin/pending-invites");
  return { ok: true, data: { id } };
}

/**
 * Đánh dấu attempt là INVITED — gọi sau khi admin tạo TK thành công ở
 * /admin/users/new (form prefill ?fromAttempt=id).
 */
export async function markAttemptInvited(
  attemptId: string
): Promise<void> {
  const actor = await requireRole("ADMIN");
  await prisma.loginAttempt.updateMany({
    where: { id: attemptId, status: "PENDING" },
    data: {
      status: "INVITED",
      resolvedAt: new Date(),
      resolvedById: actor.id,
    },
  });
  revalidatePath("/admin/pending-invites");
}
