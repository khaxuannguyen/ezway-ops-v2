/**
 * Markup ranges — admin cộng margin (%) vào giá carrier để ra giá bán cho khách.
 * Mỗi dải cân có markup % riêng (vd đơn nhỏ +30%, đơn lớn +15%).
 *
 * Pure functions — không I/O, dễ test.
 */

export interface MarkupRange {
  /** Cân tối thiểu (kg, inclusive). */
  minWeightKg: number;
  /** Cân tối đa (kg, inclusive). Dải cuối nên là OPEN_ENDED_MAX (9999). */
  maxWeightKg: number;
  /** Markup phần trăm cộng thêm (vd 20 = +20%). */
  markupPercent: number;
}

export type RoundingMode = "NONE" | "1K" | "5K" | "10K";

export interface MarkupValidationResult {
  ok: boolean;
  errors: string[];
}

/** Default 1 dải full range cho UI lần đầu. */
export function defaultMarkupRanges(): MarkupRange[] {
  return [{ minWeightKg: 0, maxWeightKg: 9999, markupPercent: 20 }];
}

/**
 * Validate ranges contiguous (không gap, không overlap) + markup >= 0.
 * Ranges phải sort theo minWeightKg trước khi gọi.
 */
export function validateMarkupRanges(
  ranges: readonly MarkupRange[]
): MarkupValidationResult {
  const errors: string[] = [];
  if (ranges.length === 0) {
    errors.push("Cần ít nhất 1 dải markup.");
    return { ok: false, errors };
  }
  const sorted = [...ranges].sort((a, b) => a.minWeightKg - b.minWeightKg);
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    if (r.minWeightKg < 0 || r.maxWeightKg < 0) {
      errors.push(`Dải #${i + 1}: cân không được âm.`);
    }
    if (r.maxWeightKg <= r.minWeightKg) {
      errors.push(
        `Dải #${i + 1}: cân tối đa (${r.maxWeightKg}) phải lớn hơn cân tối thiểu (${r.minWeightKg}).`
      );
    }
    if (r.markupPercent < 0) {
      errors.push(`Dải #${i + 1}: markup không được âm.`);
    }
    if (i > 0) {
      const prev = sorted[i - 1];
      if (r.minWeightKg < prev.maxWeightKg) {
        errors.push(
          `Dải #${i + 1} (${r.minWeightKg}-${r.maxWeightKg}kg) chồng lấp dải #${i} (${prev.minWeightKg}-${prev.maxWeightKg}kg).`
        );
      } else if (r.minWeightKg > prev.maxWeightKg) {
        errors.push(
          `Thiếu khoảng ${prev.maxWeightKg}-${r.minWeightKg}kg giữa dải #${i} và #${i + 1}.`
        );
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Tìm markup% cho 1 mức cân — pick dải đầu tiên match (min <= w <= max). */
export function findMarkupForWeight(
  weightKg: number,
  ranges: readonly MarkupRange[]
): number | null {
  for (const r of ranges) {
    if (weightKg >= r.minWeightKg && weightKg <= r.maxWeightKg) {
      return r.markupPercent;
    }
  }
  return null;
}

/** Làm tròn lên theo bước (ceil). step=0 → return as-is. */
export function roundUpTo(value: number, step: number): number {
  if (step <= 0) return Math.round(value);
  return Math.ceil(value / step) * step;
}

export function roundingStepOf(mode: RoundingMode): number {
  switch (mode) {
    case "1K": return 1000;
    case "5K": return 5000;
    case "10K": return 10000;
    default: return 0;
  }
}

/**
 * Áp markup ranges + rounding vào 1 giá carrier (cost) tại weight tương ứng.
 * Trả về giá sell (VNĐ nguyên).
 *
 * Logic: sell = ceil( cost × (1 + markup%/100), roundingStep )
 *
 * Nếu weight không nằm trong dải nào → trả lại cost gốc (không markup).
 */
export function applyMarkupSingle(args: {
  costVnd: number;
  weightKg: number;
  ranges: readonly MarkupRange[];
  rounding: RoundingMode;
}): number {
  const markup = findMarkupForWeight(args.weightKg, args.ranges) ?? 0;
  const raw = args.costVnd * (1 + markup / 100);
  return roundUpTo(raw, roundingStepOf(args.rounding));
}

export interface MarkupInput {
  weightKg: number;
  costVnd: number;
}

export interface MarkupResult extends MarkupInput {
  sellVnd: number;
  markupPercent: number;
  appliedRangeIdx: number | null;
}

/** Apply markup cho cả batch — dùng cho preview table + apply form. */
export function applyMarkupBatch(
  items: readonly MarkupInput[],
  ranges: readonly MarkupRange[],
  rounding: RoundingMode
): MarkupResult[] {
  const step = roundingStepOf(rounding);
  return items.map((it) => {
    let rangeIdx: number | null = null;
    let markup = 0;
    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      if (it.weightKg >= r.minWeightKg && it.weightKg <= r.maxWeightKg) {
        rangeIdx = i;
        markup = r.markupPercent;
        break;
      }
    }
    const raw = it.costVnd * (1 + markup / 100);
    const sell = roundUpTo(raw, step);
    return {
      weightKg: it.weightKg,
      costVnd: it.costVnd,
      sellVnd: sell,
      markupPercent: markup,
      appliedRangeIdx: rangeIdx,
    };
  });
}
