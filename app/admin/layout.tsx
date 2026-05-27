import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { countUnreadForUser } from "@/features/announcements/queries";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Quản trị · EZWAY Ops",
    template: "%s · EZWAY Ops",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Lớp chặn thứ hai (proxy.ts là lớp đầu) — bắt buộc đã đăng nhập.
  const user = await requireUser();
  const announcementUnread = await countUnreadForUser(user.id, user.role);
  return (
    <AdminShell user={user} announcementUnread={announcementUnread}>
      {children}
    </AdminShell>
  );
}
