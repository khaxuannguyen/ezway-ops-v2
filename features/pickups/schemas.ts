import { z } from "zod";
import { PickupStatus } from "@/app/generated/prisma/enums";

const phoneRegex = /^[0-9+\-\s()]{8,20}$/;

/** 1 kiện hàng — cân/đo tại điểm lấy. */
export const pickupPackageRowSchema = z.object({
  actualWeightKg: z
    .coerce.number({ message: "Cân thực phải lớn hơn 0." })
    .positive("Cân thực phải lớn hơn 0."),
  lengthCm: z
    .coerce.number({ message: "Kích thước phải lớn hơn 0." })
    .int("Kích thước phải lớn hơn 0.")
    .positive("Kích thước phải lớn hơn 0."),
  widthCm: z
    .coerce.number({ message: "Kích thước phải lớn hơn 0." })
    .int("Kích thước phải lớn hơn 0.")
    .positive("Kích thước phải lớn hơn 0."),
  heightCm: z
    .coerce.number({ message: "Kích thước phải lớn hơn 0." })
    .int("Kích thước phải lớn hơn 0.")
    .positive("Kích thước phải lớn hơn 0."),
  description: z.string().trim().optional().or(z.literal("")),
});

export type PickupPackageRowInput = z.infer<typeof pickupPackageRowSchema>;

export const pickupInputSchema = z.object({
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
  packages: z.array(pickupPackageRowSchema).min(1, "Cần ít nhất 1 kiện hàng."),
});

export type PickupInput = z.infer<typeof pickupInputSchema>;

export function parsePickupFormData(fd: FormData): Record<string, unknown> {
  const indexes = new Set<number>();
  for (const key of fd.keys()) {
    const m = key.match(
      /^packages\[(\d+)\]\[(actualWeightKg|lengthCm|widthCm|heightCm|description)\]$/
    );
    if (m) indexes.add(Number(m[1]));
  }
  const packages: Record<string, unknown>[] = [];
  for (const i of Array.from(indexes).sort((a, b) => a - b)) {
    packages.push({
      actualWeightKg: (fd.get(`packages[${i}][actualWeightKg]`) ?? "").toString(),
      lengthCm: (fd.get(`packages[${i}][lengthCm]`) ?? "").toString(),
      widthCm: (fd.get(`packages[${i}][widthCm]`) ?? "").toString(),
      heightCm: (fd.get(`packages[${i}][heightCm]`) ?? "").toString(),
      description: (fd.get(`packages[${i}][description]`) ?? "").toString(),
    });
  }

  return {
    driverId: (fd.get("driverId") ?? "").toString(),
    pickupAddress: (fd.get("pickupAddress") ?? "").toString(),
    pickupContactName: (fd.get("pickupContactName") ?? "").toString(),
    pickupContactPhone: (fd.get("pickupContactPhone") ?? "").toString(),
    scheduledAt: (fd.get("scheduledAt") ?? "").toString(),
    notes: (fd.get("notes") ?? "").toString(),
    currentStatus: (fd.get("currentStatus") ?? "PENDING").toString(),
    packages,
  };
}

export const pickupStatusSchema = z.object({
  currentStatus: z.nativeEnum(PickupStatus),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export function parsePickupStatusFormData(
  fd: FormData
): Record<string, unknown> {
  return {
    currentStatus: (fd.get("currentStatus") ?? "PENDING").toString(),
    note: (fd.get("note") ?? "").toString(),
  };
}
