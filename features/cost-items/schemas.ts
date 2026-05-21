import { z } from "zod";
import {
  CostCategory,
  CostPricingType,
} from "@/app/generated/prisma/enums";

const codeRegex = /^[A-Za-z0-9_-]{2,40}$/;

export const costItemInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập mã khoản chi phí.")
    .regex(codeRegex, "Mã chỉ gồm chữ, số, gạch ngang và gạch dưới (2-40 ký tự)."),
  name: z.string().trim().min(1, "Vui lòng nhập tên khoản chi phí."),
  category: z.nativeEnum(CostCategory),
  pricingType: z.nativeEnum(CostPricingType),
  defaultAmountVnd: z
    .union([
      z.literal(""),
      z
        .coerce.number({ message: "Số tiền không hợp lệ." })
        .int("Số tiền phải là số nguyên đồng.")
        .nonnegative("Số tiền không hợp lệ."),
    ])
    .optional(),
  unitLabel: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type CostItemInput = z.infer<typeof costItemInputSchema>;

export function parseCostItemFormData(fd: FormData): Record<string, unknown> {
  const raw = (fd.get("defaultAmountVnd") ?? "").toString().trim();
  return {
    code: (fd.get("code") ?? "").toString(),
    name: (fd.get("name") ?? "").toString(),
    category: (fd.get("category") ?? "OTHER").toString(),
    pricingType: (fd.get("pricingType") ?? "PER_UNIT").toString(),
    defaultAmountVnd: raw === "" ? "" : raw,
    unitLabel: (fd.get("unitLabel") ?? "").toString(),
    description: (fd.get("description") ?? "").toString(),
    isActive: fd.get("isActive") === "on" || fd.get("isActive") === "true",
  };
}
