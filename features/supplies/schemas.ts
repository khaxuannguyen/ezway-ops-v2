import { z } from "zod";
import {
  SupplyCategory,
  StockMovementType,
} from "@/app/generated/prisma/enums";

const codeRegex = /^[A-Za-z0-9_-]{2,40}$/;

export const supplyInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập mã vật tư.")
    .regex(codeRegex, "Mã chỉ gồm chữ, số, gạch ngang và gạch dưới (2-40 ký tự)."),
  name: z.string().trim().min(1, "Vui lòng nhập tên vật tư."),
  category: z.nativeEnum(SupplyCategory),
  unit: z.string().trim().min(1, "Vui lòng nhập đơn vị tính."),
  minStock: z
    .coerce.number({ message: "Tồn tối thiểu không hợp lệ." })
    .int("Tồn tối thiểu phải là số nguyên.")
    .nonnegative("Tồn tối thiểu không hợp lệ."),
  notes: z.string().trim().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type SupplyInput = z.infer<typeof supplyInputSchema>;

export function parseSupplyFormData(fd: FormData): Record<string, unknown> {
  return {
    code: (fd.get("code") ?? "").toString(),
    name: (fd.get("name") ?? "").toString(),
    category: (fd.get("category") ?? "PACKAGING").toString(),
    unit: (fd.get("unit") ?? "").toString(),
    minStock: (fd.get("minStock") ?? "0").toString(),
    notes: (fd.get("notes") ?? "").toString(),
    isActive: fd.get("isActive") === "on" || fd.get("isActive") === "true",
  };
}

export const stockMovementSchema = z.object({
  type: z.nativeEnum(StockMovementType),
  quantity: z
    .coerce.number({ message: "Số lượng không hợp lệ." })
    .int("Số lượng phải là số nguyên.")
    .nonnegative("Số lượng không hợp lệ."),
  note: z.string().trim().optional().or(z.literal("")),
});

export type StockMovementInput = z.infer<typeof stockMovementSchema>;

export function parseStockMovementFormData(
  fd: FormData
): Record<string, unknown> {
  return {
    type: (fd.get("type") ?? "IN").toString(),
    quantity: (fd.get("quantity") ?? "").toString(),
    note: (fd.get("note") ?? "").toString(),
  };
}
