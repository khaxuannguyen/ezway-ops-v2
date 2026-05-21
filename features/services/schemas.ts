import { z } from "zod";
import { ShippingTransportType } from "@/app/generated/prisma/enums";

const codeRegex = /^[A-Za-z0-9_-]{2,40}$/;

export const serviceInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập mã dịch vụ.")
    .regex(codeRegex, "Mã chỉ gồm chữ, số, gạch ngang và gạch dưới (2-40 ký tự)."),
  name: z.string().trim().min(1, "Vui lòng nhập tên dịch vụ."),
  transportType: z.nativeEnum(ShippingTransportType),
  destinationCode: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập mã đích đến.")
    .max(8, "Mã đích đến tối đa 8 ký tự.")
    .transform((v) => v.toUpperCase()),
  destinationName: z.string().trim().min(1, "Vui lòng nhập tên đích đến."),
  volumetricDivisor: z
    .coerce.number({ message: "Hệ số quy đổi không hợp lệ." })
    .int("Hệ số quy đổi phải là số nguyên.")
    .positive("Hệ số quy đổi phải lớn hơn 0."),
  description: z.string().trim().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type ServiceInput = z.infer<typeof serviceInputSchema>;

export function parseServiceFormData(fd: FormData): Record<string, unknown> {
  return {
    code: (fd.get("code") ?? "").toString(),
    name: (fd.get("name") ?? "").toString(),
    transportType: (fd.get("transportType") ?? "AIR").toString(),
    destinationCode: (fd.get("destinationCode") ?? "").toString(),
    destinationName: (fd.get("destinationName") ?? "").toString(),
    volumetricDivisor: (fd.get("volumetricDivisor") ?? "5000").toString(),
    description: (fd.get("description") ?? "").toString(),
    isActive: fd.get("isActive") === "on" || fd.get("isActive") === "true",
  };
}
