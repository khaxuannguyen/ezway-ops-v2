import { z } from "zod";

const phoneRegex = /^[0-9+\-\s()]{5,25}$/;

export const recipientInputSchema = z.object({
  companyName: z.string().trim().optional().or(z.literal("")),
  contactName: z.string().trim().min(1, "Vui lòng nhập tên người nhận."),
  phone: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số điện thoại.")
    .regex(phoneRegex, "Số điện thoại không hợp lệ."),
  email: z.string().trim().email("Email không hợp lệ.").optional().or(z.literal("")),

  country: z.string().trim().min(2, "Vui lòng nhập mã quốc gia (vd US, DE)."),
  stateProvince: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().min(1, "Vui lòng nhập thành phố."),
  postalCode: z.string().trim().min(1, "Vui lòng nhập mã bưu chính."),
  addressLine1: z.string().trim().min(1, "Vui lòng nhập địa chỉ."),
  addressLine2: z.string().trim().optional().or(z.literal("")),
  addressLine3: z.string().trim().optional().or(z.literal("")),

  /** Khách hàng EZWAY (sender VN) liên kết — optional để reuse cho khách khác. */
  customerId: z.string().trim().optional().or(z.literal("")),
});

export type RecipientInput = z.infer<typeof recipientInputSchema>;

export function parseRecipientFormData(fd: FormData): Record<string, unknown> {
  return {
    companyName: (fd.get("recipient.companyName") ?? "").toString(),
    contactName: (fd.get("recipient.contactName") ?? "").toString(),
    phone: (fd.get("recipient.phone") ?? "").toString(),
    email: (fd.get("recipient.email") ?? "").toString(),
    country: (fd.get("recipient.country") ?? "").toString(),
    stateProvince: (fd.get("recipient.stateProvince") ?? "").toString(),
    city: (fd.get("recipient.city") ?? "").toString(),
    postalCode: (fd.get("recipient.postalCode") ?? "").toString(),
    addressLine1: (fd.get("recipient.addressLine1") ?? "").toString(),
    addressLine2: (fd.get("recipient.addressLine2") ?? "").toString(),
    addressLine3: (fd.get("recipient.addressLine3") ?? "").toString(),
    customerId: (fd.get("recipient.customerId") ?? "").toString(),
  };
}
