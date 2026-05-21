import { z } from "zod";
import { CostRateType } from "@/app/generated/prisma/enums";

export const costRateInputSchema = z
  .object({
    serviceId: z.string().min(1, "Vui lòng chọn dịch vụ."),
    minWeightKg: z
      .coerce.number({ message: "Cân tối thiểu không hợp lệ." })
      .nonnegative("Cân tối thiểu không hợp lệ."),
    maxWeightKg: z
      .coerce.number({ message: "Cân tối đa không hợp lệ." })
      .positive("Cân tối đa không hợp lệ."),
    rateType: z.nativeEnum(CostRateType),
    amountVnd: z
      .coerce.number({ message: "Đơn giá không hợp lệ." })
      .int("Đơn giá phải là số nguyên đồng.")
      .nonnegative("Đơn giá không hợp lệ."),
    validFrom: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập ngày hiệu lực.")
      .refine((s) => !Number.isNaN(new Date(s).getTime()), "Ngày hiệu lực không hợp lệ."),
    validTo: z.string().trim().optional().or(z.literal("")),
    notes: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.maxWeightKg < data.minWeightKg) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cân tối đa phải lớn hơn hoặc bằng cân tối thiểu.",
        path: ["maxWeightKg"],
      });
    }
    if (data.validTo) {
      const from = new Date(data.validFrom).getTime();
      const to = new Date(data.validTo).getTime();
      if (Number.isNaN(to)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ngày kết thúc không hợp lệ.",
          path: ["validTo"],
        });
      } else if (to < from) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ngày kết thúc phải sau ngày hiệu lực.",
          path: ["validTo"],
        });
      }
    }
  });

export type CostRateInput = z.infer<typeof costRateInputSchema>;

export function parseCostRateFormData(fd: FormData): Record<string, unknown> {
  return {
    serviceId: (fd.get("serviceId") ?? "").toString(),
    minWeightKg: (fd.get("minWeightKg") ?? "").toString(),
    maxWeightKg: (fd.get("maxWeightKg") ?? "").toString(),
    rateType: (fd.get("rateType") ?? "PER_KG").toString(),
    amountVnd: (fd.get("amountVnd") ?? "").toString(),
    validFrom: (fd.get("validFrom") ?? "").toString(),
    validTo: (fd.get("validTo") ?? "").toString(),
    notes: (fd.get("notes") ?? "").toString(),
  };
}

// ── Bulk entry: one whole price table for a service ────────────────────────
// "Mốc cố định" (FIXED_TOTAL): each weight point is its own rate (min=max=weight).
// "Bậc theo kg" (PER_KG): a weight range with a per-kg rate.

const amountField = z
  .coerce.number({ message: "Đơn giá không hợp lệ." })
  .int("Đơn giá phải là số nguyên đồng.")
  .nonnegative("Đơn giá không hợp lệ.");

export const fixedPointRowSchema = z.object({
  weightKg: z
    .coerce.number({ message: "Mốc cân không hợp lệ." })
    .positive("Mốc cân phải lớn hơn 0."),
  amountVnd: amountField,
});

export const perKgRowSchema = z
  .object({
    minWeightKg: z
      .coerce.number({ message: "Cân tối thiểu không hợp lệ." })
      .nonnegative("Cân tối thiểu không hợp lệ."),
    maxWeightKg: z
      .coerce.number({ message: "Cân tối đa không hợp lệ." })
      .positive("Cân tối đa không hợp lệ."),
    amountVnd: amountField,
  })
  .superRefine((data, ctx) => {
    if (data.maxWeightKg < data.minWeightKg) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cân tối đa phải lớn hơn hoặc bằng cân tối thiểu.",
        path: ["maxWeightKg"],
      });
    }
  });

export const costRateBulkInputSchema = z
  .object({
    serviceId: z.string().min(1, "Vui lòng chọn dịch vụ."),
    validFrom: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập ngày hiệu lực.")
      .refine((s) => !Number.isNaN(new Date(s).getTime()), "Ngày hiệu lực không hợp lệ."),
    validTo: z.string().trim().optional().or(z.literal("")),
    fixedPoints: z.array(fixedPointRowSchema).default([]),
    perKgRows: z.array(perKgRowSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.fixedPoints.length + data.perKgRows.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cần ít nhất 1 dòng giá (mốc cố định hoặc bậc theo kg).",
        path: ["_"],
      });
    }
    if (data.validTo) {
      const from = new Date(data.validFrom).getTime();
      const to = new Date(data.validTo).getTime();
      if (Number.isNaN(to)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ngày kết thúc không hợp lệ.",
          path: ["validTo"],
        });
      } else if (to < from) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ngày kết thúc phải sau ngày hiệu lực.",
          path: ["validTo"],
        });
      }
    }
  });

export type CostRateBulkInput = z.infer<typeof costRateBulkInputSchema>;

function collectRows(
  fd: FormData,
  prefix: string,
  fields: readonly string[]
): Record<string, unknown>[] {
  const indexes = new Set<number>();
  const fieldGroup = fields.join("|");
  const re = new RegExp(`^${prefix}\\[(\\d+)\\]\\[(${fieldGroup})\\]$`);
  for (const key of fd.keys()) {
    const m = key.match(re);
    if (m) indexes.add(Number(m[1]));
  }
  const rows: Record<string, unknown>[] = [];
  for (const i of Array.from(indexes).sort((a, b) => a - b)) {
    const row: Record<string, unknown> = {};
    for (const f of fields) {
      row[f] = (fd.get(`${prefix}[${i}][${f}]`) ?? "").toString();
    }
    rows.push(row);
  }
  return rows;
}

function hasAmount(row: Record<string, unknown>): boolean {
  return String(row.amountVnd ?? "").trim() !== "";
}

export function parseCostRateBulkFormData(fd: FormData): Record<string, unknown> {
  return {
    serviceId: (fd.get("serviceId") ?? "").toString(),
    validFrom: (fd.get("validFrom") ?? "").toString(),
    validTo: (fd.get("validTo") ?? "").toString(),
    // Rows with a blank price are skipped — the admin can fill in partially.
    fixedPoints: collectRows(fd, "fixed", ["weightKg", "amountVnd"]).filter(
      hasAmount
    ),
    perKgRows: collectRows(fd, "perkg", [
      "minWeightKg",
      "maxWeightKg",
      "amountVnd",
    ]).filter(hasAmount),
  };
}
