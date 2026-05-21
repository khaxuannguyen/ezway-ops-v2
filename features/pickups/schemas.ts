import { z } from "zod";
import { PickupStatus } from "@/app/generated/prisma/enums";

const phoneRegex = /^[0-9+\-\s()]{8,20}$/;

export const pickupInputSchema = z.object({
  orderId: z.string().min(1, "Vui lòng chọn đơn hàng."),
  driverId: z.string().trim().optional().or(z.literal("")),
  pickupAddress: z.string().trim().min(1, "Vui lòng nhập địa chỉ lấy hàng."),
  pickupContactName: z.string().trim().min(1, "Vui lòng nhập tên người liên hệ."),
  pickupContactPhone: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số điện thoại hợp lệ.")
    .regex(phoneRegex, "Vui lòng nhập số điện thoại hợp lệ."),
  scheduledAt: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  currentStatus: z.nativeEnum(PickupStatus).default(PickupStatus.PENDING),
});

export type PickupInput = z.infer<typeof pickupInputSchema>;

export function parsePickupFormData(fd: FormData): Record<string, unknown> {
  return {
    orderId: (fd.get("orderId") ?? "").toString(),
    driverId: (fd.get("driverId") ?? "").toString(),
    pickupAddress: (fd.get("pickupAddress") ?? "").toString(),
    pickupContactName: (fd.get("pickupContactName") ?? "").toString(),
    pickupContactPhone: (fd.get("pickupContactPhone") ?? "").toString(),
    scheduledAt: (fd.get("scheduledAt") ?? "").toString(),
    notes: (fd.get("notes") ?? "").toString(),
    currentStatus: (fd.get("currentStatus") ?? "PENDING").toString(),
  };
}

export const pickupStatusSchema = z.object({
  currentStatus: z.nativeEnum(PickupStatus),
});

export function parsePickupStatusFormData(
  fd: FormData
): Record<string, unknown> {
  return {
    currentStatus: (fd.get("currentStatus") ?? "PENDING").toString(),
  };
}
