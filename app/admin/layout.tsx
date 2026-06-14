import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { countUnreadForUser } from "@/features/announcements/queries";
import { countPendingLoginAttempts } from "@/features/login-attempts/queries";
import { countOrdersWithoutInvoice } from "@/features/invoices/queries";
import { countSepayPending } from "@/features/sepay/queries";
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
  // Tài xế không có quyền vào /admin/* — chuyển sang dashboard riêng.
  if (user.role === "DRIVER") {
    redirect("/driver");
  }
  const isOps = user.role === "ADMIN" || user.role === "STAFF";
  const [
    announcementUnread,
    pendingInvites,
    pendingInvoices,
    pendingSepay,
  ] = await Promise.all([
    countUnreadForUser(user.id, user.role),
    user.role === "ADMIN" ? countPendingLoginAttempts() : Promise.resolve(0),
    isOps ? countOrdersWithoutInvoice() : Promise.resolve(0),
    user.role === "ADMIN" ? countSepayPending() : Promise.resolve(0),
  ]);
  return (
    <AdminShell
      user={user}
      announcementUnread={announcementUnread}
      pendingInvites={pendingInvites}
      pendingInvoices={pendingInvoices}
      pendingSepay={pendingSepay}
    >
      {children}
    </AdminShell>
  );
}
