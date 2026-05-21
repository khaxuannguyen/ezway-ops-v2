import { z } from "zod";

export const packageInputSchema = z.object({
  orderId: z.string().min(1, "Vui lòng chọn đơn hàng."),
  trackingCode: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
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
});

export type PackageInput = z.infer<typeof packageInputSchema>;

export function parsePackageFormData(fd: FormData): Record<string, unknown> {
  return {
    orderId: (fd.get("orderId") ?? "").toString(),
    trackingCode: (fd.get("trackingCode") ?? "").toString(),
    description: (fd.get("description") ?? "").toString(),
    actualWeightKg: (fd.get("actualWeightKg") ?? "").toString(),
    lengthCm: (fd.get("lengthCm") ?? "").toString(),
    widthCm: (fd.get("widthCm") ?? "").toString(),
    heightCm: (fd.get("heightCm") ?? "").toString(),
  };
}
