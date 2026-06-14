import type { PickupStatus } from "@/app/generated/prisma/enums";

/**
 * State machine cho DRIVER thao tác trên lệnh lấy hàng.
 *
 * Workflow tài xế đi giao hàng:
 *   ASSIGNED → ACCEPTED → ON_THE_WAY → ARRIVED → PICKED_UP (success)
 *                              ↓             ↓
 *                            FAILED ←─────────┘  (bất kỳ active state → FAILED kèm lý do)
 *
 * DRIVER KHÔNG được:
 *   - Set lại về PENDING / ASSIGNED (admin gán)
 *   - Set CANCELLED (admin huỷ)
 *   - Set bỏ qua step (vd ASSIGNED → PICKED_UP trực tiếp)
 */

export interface DriverTransition {
  to: PickupStatus;
  label: string;
  /** Cần nhập lý do (note) khi bấm. */
  requiresReason: boolean;
  /** Style nút: primary/destructive/default. */
  tone: "primary" | "destructive" | "default";
}

const FAILED_TRANSITION: DriverTransition = {
  to: "FAILED",
  label: "Không lấy được hàng",
  requiresReason: true,
  tone: "destructive",
};

/**
 * Trả về danh sách transitions DRIVER có thể thực hiện từ `current` status.
 * Empty list = không còn action nào (lệnh đã đóng).
 */
export function allowedDriverTransitions(
  current: PickupStatus
): DriverTransition[] {
  switch (current) {
    case "ASSIGNED":
      return [
        { to: "ACCEPTED", label: "Đã nhận lệnh", requiresReason: false, tone: "primary" },
        FAILED_TRANSITION,
      ];
    case "ACCEPTED":
      return [
        { to: "ON_THE_WAY", label: "Đang đến điểm lấy", requiresReason: false, tone: "primary" },
        FAILED_TRANSITION,
      ];
    case "ON_THE_WAY":
      return [
        { to: "ARRIVED", label: "Đã đến nơi", requiresReason: false, tone: "primary" },
        FAILED_TRANSITION,
      ];
    case "ARRIVED":
      return [
        { to: "PICKED_UP", label: "Đã lấy hàng", requiresReason: false, tone: "primary" },
        FAILED_TRANSITION,
      ];
    // PENDING (chưa gán): driver không thấy
    // PICKED_UP, FAILED, CANCELLED: terminal — driver không action
    default:
      return [];
  }
}

/** Kiểm tra DRIVER có được phép chuyển từ `from` → `to` không. */
export function canDriverTransitionTo(
  from: PickupStatus,
  to: PickupStatus
): boolean {
  return allowedDriverTransitions(from).some((t) => t.to === to);
}
