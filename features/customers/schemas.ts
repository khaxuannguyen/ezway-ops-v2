import { z } from "zod";

const phoneRegex = /^[0-9+\-\s()]{8,20}$/;

export const customerInputSchema = z
  .object({
    name: z.string().trim().min(1, "Vui lòng nhập tên khách hàng."),
    phone: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập số điện thoại hợp lệ.")
      .regex(phoneRegex, "Vui lòng nhập số điện thoại hợp lệ."),
    email: z
      .string()
      .trim()
      .email("Email không hợp lệ.")
      .optional()
      .or(z.literal("")),
    address: z.string().trim().min(1, "Vui lòng nhập địa chỉ."),
    isBusiness: z.boolean().default(false),
    taxCode: z.string().trim().optional().or(z.literal("")),
    notes: z.string().trim().optional().or(z.literal("")),
    /** ADMIN dùng để gán/đổi nhân viên sale phụ trách; SALE/STAFF không thấy ô này. */
    salesUserId: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.isBusiness && !data.taxCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Khách doanh nghiệp cần mã số thuế.",
        path: ["taxCode"],
      });
    }
  });

export type CustomerInput = z.infer<typeof customerInputSchema>;

export function parseFormData(fd: FormData): Record<string, unknown> {
  return {
    name: (fd.get("name") ?? "").toString(),
    phone: (fd.get("phone") ?? "").toString(),
    email: (fd.get("email") ?? "").toString(),
    address: (fd.get("address") ?? "").toString(),
    isBusiness: fd.get("isBusiness") === "on" || fd.get("isBusiness") === "true",
    taxCode: (fd.get("taxCode") ?? "").toString(),
    notes: (fd.get("notes") ?? "").toString(),
    salesUserId: (fd.get("salesUserId") ?? "").toString(),
  };
}
