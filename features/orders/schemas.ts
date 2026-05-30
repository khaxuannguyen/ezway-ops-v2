import { z } from "zod";
import {
  CostCategory,
  OrderStatus,
  PackageType,
  PickupMethod,
} from "@/app/generated/prisma/enums";

const phoneRegex = /^[0-9+\-\s()]{5,25}$/;

/**
 * Recipient block — form sale chỉ thu các field cốt lõi (tên / SĐT / CCCD /
 * địa chỉ gộp). Country/state/city/postal/addr1-3 vẫn còn trong DB (nullable)
 * để ADMIN tách sau khi paste sang carrier portal.
 */
export const recipientBlockSchema = z
  .object({
    recipientId: z.string().trim().optional().or(z.literal("")),
    saveAsReusable: z.boolean().default(false),
    contactName: z.string().trim().optional().or(z.literal("")),
    phone: z.string().trim().optional().or(z.literal("")),
    address: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // Reuse người nhận cũ → không cần validate.
    if (data.recipientId && data.recipientId !== "") return;
    // Tạo mới — bắt buộc 3 field.
    const required: Array<[keyof typeof data, string]> = [
      ["contactName", "Vui lòng nhập tên người nhận."],
      ["phone", "Vui lòng nhập số điện thoại."],
      ["address", "Vui lòng nhập địa chỉ."],
    ];
    for (const [field, msg] of required) {
      const v = (data[field] ?? "").toString().trim();
      if (v === "") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: [field] });
      }
    }
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

/**
 * Block tạo khách hàng mới (khi sale chọn "Tạo khách mới" trong form Order).
 * Backend sẽ tạo Customer record trước khi tạo Order.
 */
export const newCustomerBlockSchema = z.object({
  name: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  nationalId: z.string().trim().optional().or(z.literal("")),
});

export type NewCustomerBlockInput = z.infer<typeof newCustomerBlockSchema>;

/** 1 kiện hàng nhập trong form sale (khi không có pickup code). */
export const orderPackageRowSchema = z.object({
  description: z.string().trim().optional().or(z.literal("")),
  quantity: z
    .coerce.number({ message: "Số kiện phải là số nguyên dương." })
    .int("Số kiện phải là số nguyên.")
    .positive("Số kiện phải lớn hơn 0.")
    .default(1),
  packageType: z.nativeEnum(PackageType).default(PackageType.CARTON),
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

export type OrderPackageRowInput = z.infer<typeof orderPackageRowSchema>;

/** Sale form block — recipient + assignee + bill packages (khi không có pickup code). */
const saleExtraBlockShape = {
  recipient: recipientBlockSchema,
  assignedToUserId: z.string().trim().optional().or(z.literal("")),
  /** Kiện hàng nhập tay trong form Order — chỉ dùng khi không có pickupCode. */
  packages: z.array(orderPackageRowSchema).default([]),
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
  ...saleExtraBlockShape,
});

export type OrderInput = z.infer<typeof orderInputSchema>;

/** Đọc block extras (recipient + assignedTo + bill packages) từ FormData. */
function parseSaleExtraBlock(fd: FormData): Record<string, unknown> {
  // Bill packages repeater (chỉ dùng khi không có pickupCode).
  const pkgIndexes = new Set<number>();
  for (const key of fd.keys()) {
    const m = key.match(
      /^orderPkg\[(\d+)\]\[(description|quantity|packageType|actualWeightKg|lengthCm|widthCm|heightCm)\]$/
    );
    if (m) pkgIndexes.add(Number(m[1]));
  }
  const packages: Record<string, unknown>[] = [];
  for (const i of Array.from(pkgIndexes).sort((a, b) => a - b)) {
    const w = (fd.get(`orderPkg[${i}][actualWeightKg]`) ?? "").toString();
    const l = (fd.get(`orderPkg[${i}][lengthCm]`) ?? "").toString();
    if (w.trim() === "" && l.trim() === "") continue;
    packages.push({
      description: (fd.get(`orderPkg[${i}][description]`) ?? "").toString(),
      quantity:
        (fd.get(`orderPkg[${i}][quantity]`) ?? "1").toString().trim() || "1",
      packageType:
        (fd.get(`orderPkg[${i}][packageType]`) ?? "CARTON").toString().trim() ||
        "CARTON",
      actualWeightKg: w,
      lengthCm: l,
      widthCm: (fd.get(`orderPkg[${i}][widthCm]`) ?? "").toString(),
      heightCm: (fd.get(`orderPkg[${i}][heightCm]`) ?? "").toString(),
    });
  }

  return {
    assignedToUserId: (fd.get("assignedToUserId") ?? "").toString(),
    packages,
    recipient: {
      recipientId: (fd.get("recipient.recipientId") ?? "").toString(),
      saveAsReusable:
        fd.get("recipient.saveAsReusable") === "on" ||
        fd.get("recipient.saveAsReusable") === "true",
      contactName: (fd.get("recipient.contactName") ?? "").toString(),
      phone: (fd.get("recipient.phone") ?? "").toString(),
      address: (fd.get("recipient.address") ?? "").toString(),
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
    ...parseSaleExtraBlock(fd),
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

/**
 * Tạo Order — Bill packages LUÔN bắt buộc (≥1 kiện). pickupCode chỉ là
 * reference text optional, KHÔNG ảnh hưởng đến packages.
 *
 * Khách hàng: hoặc chọn khách cũ (customerId), hoặc tạo mới (newCustomer).
 * Bắt buộc 1 trong 2 — sale chưa có khách lần đầu thì điền inline.
 */
export const orderCreateInputSchema = z
  .object({
    customerId: z.string().trim().optional().or(z.literal("")),
    newCustomer: newCustomerBlockSchema.optional(),
    serviceId: z.string().min(1, "Vui lòng chọn dịch vụ."),
    salesUserId: z.string().trim().optional().or(z.literal("")),
    pickupCode: z.string().trim().optional().or(z.literal("")),
    customerFeeVnd: z
      .coerce.number({ message: "Cước thu khách không hợp lệ." })
      .int("Cước thu khách không hợp lệ.")
      .nonnegative("Cước thu khách không hợp lệ."),
    status: z.nativeEnum(OrderStatus).default(OrderStatus.DRAFT),
    pickupMethod: z.nativeEnum(PickupMethod).default(PickupMethod.NONE),
    notes: z.string().trim().optional().or(z.literal("")),
    extraCosts: z.array(extraCostRowSchema).default([]),
    suppliesUsed: z.array(supplyUsedRowSchema).default([]),
    ...saleExtraBlockShape,
    packages: z
      .array(orderPackageRowSchema)
      .min(1, "Cần ít nhất 1 kiện hàng."),
  })
  .superRefine((data, ctx) => {
    const hasExisting = !!(data.customerId && data.customerId.trim() !== "");
    const nc = data.newCustomer;
    const hasNew =
      !!nc &&
      (nc.name?.trim() ||
        nc.phone?.trim() ||
        nc.address?.trim());
    if (!hasExisting && !hasNew) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng chọn khách hàng hoặc tạo khách mới.",
        path: ["customerId"],
      });
      return;
    }
    if (hasNew && !hasExisting) {
      // Validate fields cốt lõi cho khách mới
      const required: Array<[keyof NonNullable<typeof nc>, string]> = [
        ["name", "Vui lòng nhập tên khách hàng."],
        ["phone", "Vui lòng nhập số điện thoại."],
        ["address", "Vui lòng nhập địa chỉ."],
      ];
      for (const [field, msg] of required) {
        const v = (nc![field] ?? "").toString().trim();
        if (v === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: msg,
            path: ["newCustomer", field],
          });
        }
      }
      const phone = (nc!.phone ?? "").toString().trim();
      if (phone && !phoneRegex.test(phone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Số điện thoại không hợp lệ.",
          path: ["newCustomer", "phone"],
        });
      }
    }
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
    newCustomer: {
      name: (fd.get("newCustomer.name") ?? "").toString(),
      phone: (fd.get("newCustomer.phone") ?? "").toString(),
      email: (fd.get("newCustomer.email") ?? "").toString(),
      address: (fd.get("newCustomer.address") ?? "").toString(),
      nationalId: (fd.get("newCustomer.nationalId") ?? "").toString(),
    },
    serviceId: (fd.get("serviceId") ?? "").toString(),
    salesUserId: (fd.get("salesUserId") ?? "").toString(),
    pickupCode: (fd.get("pickupCode") ?? "").toString(),
    customerFeeVnd: (fd.get("customerFeeVnd") ?? "").toString(),
    status: (fd.get("status") ?? "DRAFT").toString(),
    pickupMethod: (fd.get("pickupMethod") ?? "NONE").toString(),
    notes: (fd.get("notes") ?? "").toString(),
    extraCosts,
    suppliesUsed,
    ...parseSaleExtraBlock(fd),
  };
}
