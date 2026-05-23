import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeIdToken } from "arctic";
import { prisma } from "@/lib/prisma";
import { createSessionCookie } from "@/lib/auth";
import {
  getGoogleClient,
  resolveOrigin,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  type GoogleIdTokenClaims,
} from "@/lib/auth/google";

function fail(request: Request, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, request.url));
}

/** Google chuyển về đây sau khi người dùng đồng ý — đổi code lấy hồ sơ, tạo session. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get(GOOGLE_STATE_COOKIE)?.value;
  const codeVerifier = cookieStore.get(GOOGLE_VERIFIER_COOKIE)?.value;
  cookieStore.delete(GOOGLE_STATE_COOKIE);
  cookieStore.delete(GOOGLE_VERIFIER_COOKIE);

  // Chống CSRF: state trả về phải khớp state đã lưu.
  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return fail(request, "oauth");
  }

  let claims: GoogleIdTokenClaims;
  try {
    const google = getGoogleClient(resolveOrigin(request.url));
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    claims = decodeIdToken(tokens.idToken()) as GoogleIdTokenClaims;
  } catch {
    return fail(request, "oauth");
  }

  // Chỉ tin email khi Google xác nhận đã xác minh.
  if (!claims.email || claims.email_verified !== true) {
    return fail(request, "unverified");
  }
  const email = claims.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isActive: true, googleId: true, image: true },
  });
  // Invite-only: tài khoản phải được admin tạo trước.
  if (!user) return fail(request, "notinvited");
  if (!user.isActive) return fail(request, "locked");

  // Lần đầu đăng nhập Google → lưu googleId; cập nhật ảnh đại diện nếu đổi.
  const nextImage = claims.picture ?? user.image;
  if (!user.googleId || nextImage !== user.image) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: user.googleId ?? claims.sub ?? null,
        image: nextImage,
      },
    });
  }

  await createSessionCookie(user.id);
  return NextResponse.redirect(new URL("/admin/dashboard", request.url));
}
