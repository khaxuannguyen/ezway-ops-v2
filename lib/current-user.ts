import { getCurrentUser } from "@/lib/auth";

/**
 * ID người dùng đang thực hiện hành động (tạo đơn, ghi phiếu kho...).
 * Đọc từ session đăng nhập. Gọi trong server action — ném lỗi nếu chưa đăng nhập.
 */
export async function getActorUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error(
      "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục."
    );
  }
  return user.id;
}
