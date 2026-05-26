import { z } from "zod";
import {
  CostCategory,
  CustomsExportType,
  OrderStatus,
  PickupMethod,
} from "@/app/generated/prisma/enums";

/** Recipient — có thể reuse người nhận cũ (recipientId) hoặc tạo mới (nhập từng field). */
const phoneRegex = /^[0-9+\-\s()]{5,25}$/;
export const recipientBlockSchema = z.object({
  recipientId: z.string().trim().optional().or(z.literal("")),
  saveAsReusable: z.boolean().default(false),
  companyName: z.string().trim().optional().or(z.literal("")),
  contactName: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().optional().or(z.literal("")),
  country: z.string().trim().optional().or(z.literal("")),
  stateProvince: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  postalCode: z.string().trim().optional().or(z.literal("")),
  addressLine1: z.string().trim().optional().or(z.literal("")),
  addressLine2: z.string().trim().optional().or(z.literal("")),
  addressLine3: z.string().trim().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  // Nếu chọn người nhận cũ thì không cần nhập tay.
  if (data.recipientId && data.recipientId !== "") return;
  // Tạo mới → bắt buộc 5 field cốt lõi.
  const required: Array<[keyof typeof data, string]> = [
    ["contactName", "Vui lòng nhập tên người nhận."],
    ["phone", "Vui lòng nhập số điện thoại."],
    ["country", "Vui lòng nhập mã quốc gia (vd US, DE)."],
    ["city", "Vui lòng nhập thành phố."],
    ["postalCode", "Vui lòng nhập mã bưu chính."],
    ["addressLine1", "Vui lòng nhập địa chỉ dòng 1."],
  ];
  for (const [field, msg] of required) {
    const v = (data[field] ?? "").toString().trim();
    if (v === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: [field] });
    }
  }
  // Phone format check khi tạo mới.
  const phone = (data.phone ?? "").toString().trim();
  if (phone && !phoneRegex.test(phone)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Số điện thoại không hợp lệ.",
      path: ["phone"],
    });
  }
});

export type RecipientBlockInput = z.infer<typeof recipientBlockSchema>;

export const invoiceItemRowSchema = z.object({
  description: z.string().trim().min(1, "Vui lòng nhập mô tả hàng."),
  quantity: z
    .coerce.number({ message: "Số lượng không hợp lệ." })
    .int("Số lượng phải là số nguyên.")
    .positive("Số lượng phải lớn hơn 0."),
  unit: z.string().trim().min(1, "Vui lòng chọn đơn vị."),
  unitPriceUsd: z
    .coerce.number({ message: "Đơn giá không hợp lệ." })
    .nonnegative("Đơn giá không hợp lệ."),
});

export type InvoiceItemRowInput = z.infer<typeof invoiceItemRowSchema>;

const carrierForwardBlockShape = {
  customsExportType: z
    .nativeEnum(CustomsExportType)
    .default(CustomsExportType.GIFT),
  serviceTier: z.string().trim().optional().or(z.literal("")),
  requiresSignature: z.boolean().default(false),
  branchCode: z.string().trim().optional().or(z.literal("")),
  invoiceItems: z.array(invoiceItemRowSchema).default([]),
  recipient: recipientBlockSchema,
};

export const orderInputSchema = z.object({
  customerId: z.string().min(1, "Vui lòng chọn khách hàng."),
  serviceId: z.string().min(1, "Vui lòng chọn dịch vụ."),
  salesUserId: z.string().trim().optional().or(z.literal("")),
  customerFeeVnd: z
    .coerce.number({ message: "Cước thu khách không hợp lệ." })
    .int("Cước thu khách không hợp lệ.")
    .nonnegative("Cước thu khách không hợp lệ."),
  status: z.nativeEnum(OrderStatus).default(OrderStatus.DRAFT),
  pickupMethod: z.nativeEnum(PickupMethod).default(PickupMethod.NONE),
  notes: z.string().trim().optional().or(z.literal("")),
  ...carrierForwardBlockShape,
});

export type OrderInput = z.infer<typeof orderInputSchema>;

/** Đọc các trường carrier/recipient/invoiceItems từ FormData. */
function parseCarrierForwardBlock(fd: FormData): Record<string, unknown> {
  const itemIndexes = new Set<number>();
  for (const key of fd.keys()) {
    const m = key.match(
      /^invoiceItem\[(\d+)\]\[(description|quantity|unit|unitPriceUsd)\]$/
    );
    if (m) itemIndexes.add(Number(m[1]));
  }
  const invoiceItems: Record<string, unknown>[] = [];
  for (const i of Array.from(itemIndexes).sort((a, b) => a - b)) {
    const description = (fd.get(`invoiceItem[${i}][description]`) ?? "").toString();
    const unitPriceUsd = (fd.get(`invoiceItem[${i}][unitPriceUsd]`) ?? "").toString();
    if (description.trim() === "" && unitPriceUsd.trim() === "") continue;
    invoiceItems.push({
      description,
      quantity: (fd.get(`invoiceItem[${i}][quantity]`) ?? "1").toString(),
      unit: (fd.get(`invoiceItem[${i}][unit]`) ?? "Pcs").toString(),
      unitPriceUsd,
    });
  }

  return {
    customsExportType: (fd.get("customsExportType") ?? "GIFT").toString(),
    serviceTier: (fd.get("serviceTier") ?? "").toString(),
    requiresSignature:
      fd.get("requiresSignature") === "on" ||
      fd.get("requiresSignature") === "true",
    branchCode: (fd.get("branchCode") ?? "").toString(),
    invoiceItems,
    recipient: {
      recipientId: (fd.get("recipient.recipientId") ?? "").toString(),
      saveAsReusable:
        fd.get("recipient.saveAsReusable") === "on" ||
        fd.get("recipient.saveAsReusable") === "true",
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
    },
  };
}

export function parseOrderFormData(fd: FormData): Record<string, unknown> {
  return {
    customerId: (fd.get("customerId") ?? "").toString(),
    serviceId: (fd.get("serviceId") ?? "").toString(),
    salesUserId: (fd.get("salesUserId") ?? "").toString(),
    customerFeeVnd: (fd.get("customerFeeVnd") ?? "").toString(),
    status: (fd.get("status") ?? "DRAFT").toString(),
    pickupMethod: (fd.get("pickupMethod") ?? "NONE").toString(),
    notes: (fd.get("notes") ?? "").toString(),
    ...parseCarrierForwardBlock(fd),
  };
}

export const extraCostRowSchema = z.object({
  costItemId: z.string().trim().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Vui lòng nhập tên khoản chi phí."),
  category: z.nativeEnum(CostCategory).default(CostCategory.OTHER),
  quantity: z
    .coerce.number({ message: "Số lượng không hợp lệ." })
    .positive("Số lượng phải lớn hơn 0."),
  unitAmountVnd: z
    .coerce.number({ message: "Đơn giá không hợp lệ." })
    .int("Đơn giá phải là số nguyên đồng.")
    .nonnegative("Đơn giá không hợp lệ."),
  note: z.string().trim().optional().or(z.literal("")),
});

export type ExtraCostRowInput = z.infer<typeof extraCostRowSchema>;

export const supplyUsedRowSchema = z.object({
  supplyId: z.string().min(1, "Vui lòng chọn vật tư."),
  quantity: z
    .coerce.number({ message: "Số lượng không hợp lệ." })
    .int("Số lượng phải là số nguyên.")
    .positive("Số lượng phải lớn hơn 0."),
});

export type SupplyUsedRowInput = z.infer<typeof supplyUsedRowSchema>;

export const orderCreateInputSchema = z.object({
  customerId: z.string().min(1, "Vui lòng chọn khách hàng."),
  serviceId: z.string().min(1, "Vui lòng chọn dịch vụ."),
  salesUserId: z.string().trim().optional().or(z.literal("")),
  pickupCode: z.string().trim().min(1, "Vui lòng nhập mã lệnh lấy hàng."),
  customerFeeVnd: z
    .coerce.number({ message: "Cước thu khách không hợp lệ." })
    .int("Cước thu khách không hợp lệ.")
    .nonnegative("Cước thu khách không hợp lệ."),
  status: z.nativeEnum(OrderStatus).default(OrderStatus.DRAFT),
  pickupMethod: z.nativeEnum(PickupMethod).default(PickupMethod.NONE),
  notes: z.string().trim().optional().or(z.literal("")),
  extraCosts: z.array(extraCostRowSchema).default([]),
  suppliesUsed: z.array(supplyUsedRowSchema).default([]),
  ...carrierForwardBlockShape,
});

export type OrderCreateInput = z.infer<typeof orderCreateInputSchema>;

export function parseOrderCreateFormData(fd: FormData): Record<string, unknown> {
  const extraIndexes = new Set<number>();
  for (const key of fd.keys()) {
    const m = key.match(
      /^extra\[(\d+)\]\[(costItemId|name|category|quantity|unitAmountVnd|note)\]$/
    );
    if (m) extraIndexes.add(Number(m[1]));
  }
  const extraCosts: Record<string, unknown>[] = [];
  for (const i of Array.from(extraIndexes).sort((a, b) => a - b)) {
    const name = (fd.get(`extra[${i}][name]`) ?? "").toString();
    const unitAmountVnd = (fd.get(`extra[${i}][unitAmountVnd]`) ?? "").toString();
    // Skip rows the admin left entirely blank.
    if (name.trim() === "" && unitAmountVnd.trim() === "") continue;
    extraCosts.push({
      costItemId: (fd.get(`extra[${i}][costItemId]`) ?? "").toString(),
      name,
      category: (fd.get(`extra[${i}][category]`) ?? "OTHER").toString(),
      quantity: (fd.get(`extra[${i}][quantity]`) ?? "1").toString(),
      unitAmountVnd,
      note: (fd.get(`extra[${i}][note]`) ?? "").toString(),
    });
  }

  const supplyIndexes = new Set<number>();
  for (const key of fd.keys()) {
    const m = key.match(/^supply\[(\d+)\]\[(supplyId|quantity)\]$/);
    if (m) supplyIndexes.add(Number(m[1]));
  }
  const suppliesUsed: Record<string, unknown>[] = [];
  for (const i of Array.from(supplyIndexes).sort((a, b) => a - b)) {
    const supplyId = (fd.get(`supply[${i}][supplyId]`) ?? "").toString();
    const quantity = (fd.get(`supply[${i}][quantity]`) ?? "").toString();
    if (supplyId.trim() === "" && quantity.trim() === "") continue;
    suppliesUsed.push({ supplyId, quantity });
  }

  return {
    customerId: (fd.get("customerId") ?? "").toString(),
    serviceId: (fd.get("serviceId") ?? "").toString(),
    salesUserId: (fd.get("salesUserId") ?? "").toString(),
    pickupCode: (fd.get("pickupCode") ?? "").toString(),
    customerFeeVnd: (fd.get("customerFeeVnd") ?? "").toString(),
    status: (fd.get("status") ?? "DRAFT").toString(),
    pickupMethod: (fd.get("pickupMethod") ?? "NONE").toString(),
    notes: (fd.get("notes") ?? "").toString(),
    extraCosts,
    suppliesUsed,
    ...parseCarrierForwardBlock(fd),
  };
}
