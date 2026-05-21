import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/** Bam mat khau truoc khi luu vao DB. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** So khop mat khau nguoi dung nhap voi hash da luu. */
export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
