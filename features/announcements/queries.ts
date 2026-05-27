import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/app/generated/prisma/enums";

export interface AnnouncementListRow {
  id: string;
  title: string;
  isPinned: boolean;
  publishedAt: Date;
  author: { id: string; name: string };
  visibleToRoles: UserRole[];
  isRead: boolean;
}

/**
 * Lấy danh sách thông báo cho user theo role:
 * - visibleToRoles trống = mọi role thấy.
 * - Lọc expiresAt > now hoặc null.
 * - Sort: pinned trước, publishedAt desc.
 * - Kèm cờ isRead (cho user hiện tại).
 */
export async function listAnnouncementsForUser(
  userId: string,
  userRole: UserRole
): Promise<AnnouncementListRow[]> {
  const now = new Date();
  const rows = await prisma.announcement.findMany({
    where: {
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      AND: [
        {
          OR: [
            { visibleToRoles: { isEmpty: true } },
            { visibleToRoles: { has: userRole } },
          ],
        },
      ],
    },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    include: {
      author: { select: { id: true, name: true } },
      reads: { where: { userId }, select: { id: true } },
    },
  });
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    isPinned: a.isPinned,
    publishedAt: a.publishedAt,
    author: a.author,
    visibleToRoles: a.visibleToRoles,
    isRead: a.reads.length > 0,
  }));
}

/** Đếm số thông báo chưa đọc cho user (badge sidebar). */
export async function countUnreadForUser(
  userId: string,
  userRole: UserRole
): Promise<number> {
  const now = new Date();
  const total = await prisma.announcement.count({
    where: {
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      AND: [
        {
          OR: [
            { visibleToRoles: { isEmpty: true } },
            { visibleToRoles: { has: userRole } },
          ],
        },
      ],
    },
  });
  const read = await prisma.announcementRead.count({
    where: {
      userId,
      announcement: {
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        AND: [
          {
            OR: [
              { visibleToRoles: { isEmpty: true } },
              { visibleToRoles: { has: userRole } },
            ],
          },
        ],
      },
    },
  });
  return Math.max(0, total - read);
}

export async function getAnnouncementById(id: string) {
  const a = await prisma.announcement.findUnique({
    where: { id },
    include: { author: { select: { id: true, name: true } } },
  });
  if (!a || a.deletedAt) return null;
  return a;
}
