import { z } from "zod";
import {
  CostCategory,
  OrderStatus,
  PickupMethod,
} from "@/app/generated/prisma/enums";

export const orderInputSchema = z.object({
  customerId: z.string().min(1, "Vui lòng chọn khách hàng."),
  serviceId: z.string().min(1, "Vui lòng chọn dịch vụ."),
  chargeableWeightKg: z
    .coerce.number({ message: "Cân tính cước phải lớn hơn 0." })
    .positive("Cân tính cước phải lớn hơn 0."),
  customerFeeVnd: z
    .coerce.number({ message: "Cước thu khách không hợp lệ." })
    .int("Cước thu khách không hợp lệ.")
    .nonnegative("Cước thu khách không hợp lệ."),
  status: z.nativeEnum(OrderStatus).default(OrderStatus.DRAFT),
  pickupMethod: z.nativeEnum(PickupMethod).default(PickupMethod.NONE),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type OrderInput = z.infer<typeof orderInputSchema>;

export function parseOrderFormData(fd: FormData): Record<string, unknown> {
  return {
    customerId: (fd.get("customerId") ?? "").toString(),
    serviceId: (fd.get("serviceId") ?? "").toString(),
    chargeableWeightKg: (fd.get("chargeableWeightKg") ?? "").toString(),
    customerFeeVnd: (fd.get("customerFeeVnd") ?? "").toString(),
    status: (fd.get("status") ?? "DRAFT").toString(),
    pickupMethod: (fd.get("pickupMethod") ?? "NONE").toString(),
    notes: (fd.get("notes") ?? "").toString(),
  };
}

export const packageRowSchema = z.object({
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
  description: z.string().trim().optional().or(z.literal("")),
});

export type PackageRowInput = z.infer<typeof packageRowSchema>;

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
  customerFeeVnd: z
    .coerce.number({ message: "Cước thu khách không hợp lệ." })
    .int("Cước thu khách không hợp lệ.")
    .nonnegative("Cước thu khách không hợp lệ."),
  status: z.nativeEnum(OrderStatus).default(OrderStatus.DRAFT),
  pickupMethod: z.nativeEnum(PickupMethod).default(PickupMethod.NONE),
  notes: z.string().trim().optional().or(z.literal("")),
  packages: z
    .array(packageRowSchema)
    .min(1, "Cần ít nhất 1 kiện hàng."),
  extraCosts: z.array(extraCostRowSchema).default([]),
  suppliesUsed: z.array(supplyUsedRowSchema).default([]),
});

export type OrderCreateInput = z.infer<typeof orderCreateInputSchema>;

export function parseOrderCreateFormData(fd: FormData): Record<string, unknown> {
  const packages: Record<string, unknown>[] = [];
  const pkgIndexes = new Set<number>();
  for (const key of fd.keys()) {
    const m = key.match(/^packages\[(\d+)\]\[(actualWeightKg|lengthCm|widthCm|heightCm|description)\]$/);
    if (m) pkgIndexes.add(Number(m[1]));
  }
  for (const i of Array.from(pkgIndexes).sort((a, b) => a - b)) {
    packages.push({
      actualWeightKg: (fd.get(`packages[${i}][actualWeightKg]`) ?? "").toString(),
      lengthCm: (fd.get(`packages[${i}][lengthCm]`) ?? "").toString(),
      widthCm: (fd.get(`packages[${i}][widthCm]`) ?? "").toString(),
      heightCm: (fd.get(`packages[${i}][heightCm]`) ?? "").toString(),
      description: (fd.get(`packages[${i}][description]`) ?? "").toString(),
    });
  }

  const extraIndexes = new Set<number>();
  for (const key of fd.keys()) {
    const m = key.match(/^extra\[(\d+)\]\[(costItemId|name|category|quantity|unitAmountVnd|note)\]$/);
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
    // Skip rows the admin left entirely blank.
    if (supplyId.trim() === "" && quantity.trim() === "") continue;
    suppliesUsed.push({ supplyId, quantity });
  }

  return {
    customerId: (fd.get("customerId") ?? "").toString(),
    serviceId: (fd.get("serviceId") ?? "").toString(),
    customerFeeVnd: (fd.get("customerFeeVnd") ?? "").toString(),
    status: (fd.get("status") ?? "DRAFT").toString(),
    pickupMethod: (fd.get("pickupMethod") ?? "NONE").toString(),
    notes: (fd.get("notes") ?? "").toString(),
    packages,
    extraCosts,
    suppliesUsed,
  };
}
