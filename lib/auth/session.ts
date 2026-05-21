import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/** Ten cookie chua session (JWT da ky). */
export const SESSION_COOKIE = "ezway_session";

/** Thoi han session: 7 ngay. */
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export interface SessionPayload {
  userId: string;
}

function getSigningKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "Thiếu SESSION_SECRET (>=16 ký tự) trong .env — bắt buộc để ký session."
    );
  }
  return new TextEncoder().encode(secret);
}

/** Ky payload thanh JWT HS256. */
export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSigningKey());
}

/** Verify + giai ma JWT session. Tra null neu thieu / sai chu ky / het han. */
export async function decryptSession(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      algorithms: ["HS256"],
    });
    return typeof payload.userId === "string"
      ? { userId: payload.userId }
      : null;
  } catch {
    return null;
  }
}

/** Ghi cookie session sau khi dang nhap thanh cong. */
export async function createSessionCookie(userId: string): Promise<void> {
  const token = await encryptSession({ userId });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

/** Xoa cookie session khi dang xuat. */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Doc + verify session tu cookie cua request hien tai. */
export async function readSessionCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return decryptSession(token);
}
