import { Google } from "arctic";

/** Cookie tạm giữ state + code verifier giữa lúc redirect đi Google và lúc quay về. */
export const GOOGLE_STATE_COOKIE = "g_oauth_state";
export const GOOGLE_VERIFIER_COOKIE = "g_oauth_verifier";

/** Scope OIDC — đủ để lấy email đã xác minh, tên, ảnh đại diện. */
export const GOOGLE_SCOPES = ["openid", "profile", "email"];

/** Có cấu hình đăng nhập Google chưa (đủ client id + secret). */
export function isGoogleAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
}

/** Origin của app — ưu tiên APP_URL, nếu không có thì lấy từ request. */
export function resolveOrigin(requestUrl: string): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? new URL(requestUrl).origin;
}

/** Tạo client OAuth Google. redirectURI phải khớp Authorized redirect URIs ở Google Console. */
export function getGoogleClient(origin: string): Google {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Thiếu GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET trong .env."
    );
  }
  return new Google(clientId, clientSecret, `${origin}/api/auth/google/callback`);
}

/** Claims trong id_token của Google (phần cần dùng). */
export interface GoogleIdTokenClaims {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}
