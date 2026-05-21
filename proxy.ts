import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, decryptSession } from "@/lib/auth/session";

/**
 * Cổng chặn route (Next 16 đổi tên middleware -> proxy).
 * - Chưa đăng nhập mà vào /admin/* -> chuyển về /login.
 * - Đã đăng nhập mà vào /login -> chuyển về /admin/dashboard.
 * Đây là lớp chặn tối ưu; mỗi server action vẫn tự kiểm tra phiên riêng.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await decryptSession(token);
  const isLoggedIn = Boolean(session);

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLoginRoute = pathname === "/login";

  if (isAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isLoginRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/login"],
};
