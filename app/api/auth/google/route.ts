import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateState, generateCodeVerifier } from "arctic";
import {
  getGoogleClient,
  isGoogleAuthConfigured,
  resolveOrigin,
  GOOGLE_SCOPES,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
} from "@/lib/auth/google";

/** Bắt đầu luồng đăng nhập Google — chuyển hướng tới trang đồng ý của Google. */
export async function GET(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_disabled", request.url)
    );
  }

  const origin = resolveOrigin(request.url);
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = getGoogleClient(origin).createAuthorizationURL(
    state,
    codeVerifier,
    GOOGLE_SCOPES
  );

  const cookieStore = await cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
  };
  cookieStore.set(GOOGLE_STATE_COOKIE, state, opts);
  cookieStore.set(GOOGLE_VERIFIER_COOKIE, codeVerifier, opts);

  return NextResponse.redirect(url);
}
