import { z } from "zod";

const METHOD_VALUES = ["CASH", "BANK_TRANSFER", "COD", "OTHER"] as const;

export const paymentInputSchema = z.object({
  amountVnd: z
    .coerce
    .number({ message: "Vui lòng nhập số tiền hợp lệ." })
    .int("Vui lòng nhập số nguyên VND.")
    .refine((v) => v !== 0, "Số tiền phải khác 0."),
  method: z.enum(METHOD_VALUES),
  paidAt: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập ngày thu.")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Ngày thu không hợp lệ."),
  reference: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type PaymentInput = z.infer<typeof paymentInputSchema>;

export function parsePaymentFormData(fd: FormData): Record<string, unknown> {
  return {
    amountVnd: (fd.get("amountVnd") ?? "").toString().trim(),
    method: (fd.get("method") ?? "CASH").toString(),
    paidAt: (fd.get("paidAt") ?? "").toString(),
    reference: (fd.get("reference") ?? "").toString(),
    notes: (fd.get("notes") ?? "").toString(),
  };
}
