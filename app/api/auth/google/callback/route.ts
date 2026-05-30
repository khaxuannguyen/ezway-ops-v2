import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
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
import { notifyAdminsOfLoginAttempt } from "@/lib/notification/login-attempt-notify";

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
  if (!user) {
    // Record attempt + notify admin (best-effort, không chặn redirect nếu lỗi).
    try {
      await recordLoginAttempt({
        email,
        name: claims.name ?? null,
        picture: claims.picture ?? null,
        googleSub: claims.sub ?? null,
        request,
      });
    } catch (e) {
      console.error("[login-attempt] record failed", e);
    }
    return fail(request, "notinvited");
  }
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

/**
 * Ghi/cập nhật LoginAttempt cho 1 email chưa được mời + gửi email admin
 * (rate-limit 1 email/giờ/email).
 */
async function recordLoginAttempt(input: {
  email: string;
  name: string | null;
  picture: string | null;
  googleSub: string | null;
  request: Request;
}): Promise<void> {
  const h = await headers();
  const ipAddress =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;
  const userAgent = h.get("user-agent");

  // Upsert: 1 row PENDING per email — attempt mới chỉ increment count.
  const existing = await prisma.loginAttempt.findFirst({
    where: { email: input.email, status: "PENDING" },
    select: { id: true, attemptCount: true, lastNotifiedAt: true },
  });
  let record;
  if (existing) {
    record = await prisma.loginAttempt.update({
      where: { id: existing.id },
      data: {
        attemptedAt: new Date(),
        attemptCount: existing.attemptCount + 1,
        name: input.name ?? undefined,
        picture: input.picture ?? undefined,
        googleSub: input.googleSub ?? undefined,
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent ?? undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        ipAddress: true,
        attemptedAt: true,
        attemptCount: true,
        lastNotifiedAt: true,
      },
    });
  } else {
    record = await prisma.loginAttempt.create({
      data: {
        email: input.email,
        name: input.name,
        picture: input.picture,
        googleSub: input.googleSub,
        ipAddress,
        userAgent,
      },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        ipAddress: true,
        attemptedAt: true,
        attemptCount: true,
        lastNotifiedAt: true,
      },
    });
  }

  const sent = await notifyAdminsOfLoginAttempt(
    {
      email: record.email,
      name: record.name,
      picture: record.picture,
      ipAddress: record.ipAddress,
      attemptedAt: record.attemptedAt,
      attemptCount: record.attemptCount,
    },
    new URL(input.request.url).origin,
    record.lastNotifiedAt
  );
  if (sent) {
    await prisma.loginAttempt.update({
      where: { id: record.id },
      data: { lastNotifiedAt: sent },
    });
  }
}
