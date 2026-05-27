"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole } from "@/lib/auth";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import {
  announcementInputSchema,
  parseAnnouncementFormData,
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

function fieldErrorsFrom(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>
): FieldErrors {
  const fe: FieldErrors = {};
  for (const issue of issues) {
    const k = issue.path.map((p) => String(p)).join(".") || "_";
    fe[k] = fe[k] ?? [];
    fe[k].push(issue.message);
  }
  return fe;
}

function parseExpiresAt(s: string | undefined | null): Date | null {
  if (!s) return null;
  const t = s.trim();
  if (t === "") return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createAnnouncement(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("ADMIN");

  const parsed = announcementInputSchema.safeParse(
    parseAnnouncementFormData(formData)
  );
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const data = parsed.data;

  try {
    const created = await prisma.announcement.create({
      data: {
        title: data.title,
        body: data.body,
        isPinned: data.isPinned,
        visibleToRoles: data.visibleToRoles,
        authorId: actor.id,
        expiresAt: parseExpiresAt(data.expiresAt),
      },
      select: { id: true },
    });
    revalidatePath("/admin/announcements");
    redirect(`/admin/announcements/${created.id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { ok: false, formError: "Không thể lưu thông báo. Vui lòng thử lại." };
  }
}

export async function updateAnnouncement(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  await requireRole("ADMIN");

  const parsed = announcementInputSchema.safeParse(
    parseAnnouncementFormData(formData)
  );
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const data = parsed.data;

  try {
    await prisma.announcement.update({
      where: { id },
      data: {
        title: data.title,
        body: data.body,
        isPinned: data.isPinned,
        visibleToRoles: data.visibleToRoles,
        expiresAt: parseExpiresAt(data.expiresAt),
      },
    });
    revalidatePath("/admin/announcements");
    revalidatePath(`/admin/announcements/${id}`);
    redirect(`/admin/announcements/${id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { ok: false, formError: "Không thể lưu thông báo." };
  }
}

/** Toggle pin từ list (ADMIN). */
export async function togglePinAnnouncement(
  id: string
): Promise<ActionResult<{ id: string }>> {
  await requireRole("ADMIN");
  const ann = await prisma.announcement.findUnique({
    where: { id },
    select: { isPinned: true },
  });
  if (!ann) return { ok: false, formError: "Không tìm thấy thông báo." };
  await prisma.announcement.update({
    where: { id },
    data: { isPinned: !ann.isPinned },
  });
  revalidatePath("/admin/announcements");
  return { ok: true, data: { id } };
}

/** Soft-delete (ADMIN). */
export async function deleteAnnouncement(id: string): Promise<void> {
  await requireRole("ADMIN");
  await prisma.announcement.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/admin/announcements");
}

/** Đánh dấu đã đọc cho user hiện tại (mọi role). Idempotent. */
export async function markAsRead(announcementId: string): Promise<void> {
  const actor = await getCurrentUser();
  if (!actor) return;
  await prisma.announcementRead.upsert({
    where: {
      announcementId_userId: { announcementId, userId: actor.id },
    },
    create: { announcementId, userId: actor.id },
    update: {},
  });
  revalidatePath("/admin/announcements");
  revalidatePath(`/admin/announcements/${announcementId}`);
}
