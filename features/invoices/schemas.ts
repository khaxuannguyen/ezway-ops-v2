import { z } from "zod";

export const invoiceInputSchema = z.object({
  invoiceNumber: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số HDDT.")
    .max(50, "Số HDDT quá dài."),
  lookupCode: z.string().trim().optional().or(z.literal("")),
  issuedAt: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập ngày xuất HDDT.")
    .refine(
      (v) => !Number.isNaN(new Date(v).getTime()),
      "Ngày xuất HDDT không hợp lệ."
    ),
  totalVnd: z
    .coerce.number({ message: "Tổng tiền HDDT không hợp lệ." })
    .int("Tổng tiền HDDT phải là số nguyên VNĐ.")
    .positive("Tổng tiền HDDT phải lớn hơn 0."),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type InvoiceInput = z.infer<typeof invoiceInputSchema>;

export function parseInvoiceFormData(fd: FormData): Record<string, unknown> {
  return {
    invoiceNumber: (fd.get("invoiceNumber") ?? "").toString(),
    lookupCode: (fd.get("lookupCode") ?? "").toString(),
    issuedAt: (fd.get("issuedAt") ?? "").toString(),
    totalVnd: (fd.get("totalVnd") ?? "").toString(),
    notes: (fd.get("notes") ?? "").toString(),
  };
}
