import { prisma } from "@/lib/prisma";
import { sendEmail } from "./resend";

/** Rate limit: 1 email/giờ cho cùng 1 email attempted, tránh spam admin. */
const NOTIFY_COOLDOWN_MS = 60 * 60 * 1000;

export interface LoginAttemptInfo {
  email: string;
  name?: string | null;
  picture?: string | null;
  ipAddress?: string | null;
  attemptedAt: Date;
  attemptCount: number;
}

/**
 * Gửi email cho TẤT CẢ user role ADMIN active trong DB.
 * - Override qua env `ADMIN_NOTIFICATION_EMAIL` nếu set (single email cho test).
 * - Skip nếu vừa gửi cho email này < 1 giờ trước (rate limit).
 *
 * Trả về Date nếu gửi (caller cập nhật `lastNotifiedAt`), null nếu skip.
 */
export async function notifyAdminsOfLoginAttempt(
  info: LoginAttemptInfo,
  appOrigin: string,
  lastNotifiedAt: Date | null
): Promise<Date | null> {
  // Rate limit
  if (lastNotifiedAt && Date.now() - lastNotifiedAt.getTime() < NOTIFY_COOLDOWN_MS) {
    return null;
  }

  // Recipient list
  const envOverride = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  let recipients: string[];
  if (envOverride) {
    recipients = [envOverride];
  } else {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { email: true },
    });
    recipients = admins.map((a) => a.email).filter(Boolean);
  }
  if (recipients.length === 0) {
    console.warn("[login-attempt-notify] Không có admin nhận email.");
    return null;
  }

  const subject = `[EZWAY Ops] Yêu cầu cấp quyền: ${info.email}`;
  const pendingUrl = `${appOrigin.replace(/\/$/, "")}/admin/pending-invites`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Inter, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; color: #14213D;">
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1E2F5E;">Yêu cầu cấp quyền truy cập EZWAY Ops</h2>
      <p style="margin: 0 0 12px 0; font-size: 14px;">Một email Google chưa được mời đã cố đăng nhập hệ thống:</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 0 0 20px 0;">
        <tr><td style="padding: 6px 0; color: #6b7280; width: 120px;">Email</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(info.email)}</td></tr>
        ${info.name ? `<tr><td style="padding: 6px 0; color: #6b7280;">Tên</td><td style="padding: 6px 0;">${escapeHtml(info.name)}</td></tr>` : ""}
        <tr><td style="padding: 6px 0; color: #6b7280;">Thời gian</td><td style="padding: 6px 0;">${info.attemptedAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Số lần thử</td><td style="padding: 6px 0;">${info.attemptCount}</td></tr>
        ${info.ipAddress ? `<tr><td style="padding: 6px 0; color: #6b7280;">IP</td><td style="padding: 6px 0; font-family: monospace; font-size: 12px;">${escapeHtml(info.ipAddress)}</td></tr>` : ""}
      </table>
      <a href="${pendingUrl}" style="display: inline-block; background: #1E2F5E; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">Mở danh sách yêu cầu</a>
      <p style="margin: 24px 0 0 0; font-size: 12px; color: #6b7280;">Nếu là nhân viên thật → vào trang Yêu cầu cấp quyền, bấm "Tạo TK ngay". Nếu là email lạ → bấm "Bỏ qua" để xoá khỏi danh sách.</p>
    </div>
  `.trim();
  const text = [
    "Yêu cầu cấp quyền truy cập EZWAY Ops",
    "",
    `Email: ${info.email}`,
    info.name ? `Tên: ${info.name}` : null,
    `Thời gian: ${info.attemptedAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`,
    `Số lần thử: ${info.attemptCount}`,
    info.ipAddress ? `IP: ${info.ipAddress}` : null,
    "",
    `Mở danh sách: ${pendingUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await sendEmail({ to: recipients, subject, html, text });
  return result.ok ? new Date() : null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
