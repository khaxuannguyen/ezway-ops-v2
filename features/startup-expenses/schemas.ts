import { z } from "zod";
import {
  ExpenseCategory,
  ExpenseStatus,
} from "@/app/generated/prisma/enums";

export const startupExpenseInputSchema = z.object({
  itemName: z.string().trim().min(1, "Vui lòng nhập tên khoản chi."),
  category: z.nativeEnum(ExpenseCategory),
  amountVnd: z
    .coerce.number({ message: "Số tiền không hợp lệ." })
    .int("Số tiền phải là số nguyên đồng.")
    .nonnegative("Số tiền không hợp lệ."),
  status: z.nativeEnum(ExpenseStatus).default(ExpenseStatus.UNPAID),
  paymentDate: z.string().trim().optional().or(z.literal("")),
  paidBy: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().optional().or(z.literal("")),
});

export type StartupExpenseInput = z.infer<typeof startupExpenseInputSchema>;

export function parseStartupExpenseFormData(
  fd: FormData
): Record<string, unknown> {
  return {
    itemName: (fd.get("itemName") ?? "").toString(),
    category: (fd.get("category") ?? "OTHER").toString(),
    amountVnd: (fd.get("amountVnd") ?? "").toString(),
    status: (fd.get("status") ?? "UNPAID").toString(),
    paymentDate: (fd.get("paymentDate") ?? "").toString(),
    paidBy: (fd.get("paidBy") ?? "").toString(),
    note: (fd.get("note") ?? "").toString(),
  };
}
