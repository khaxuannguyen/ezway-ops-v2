// Standard weight scale for service price tables.
// The weight column is fixed: admins only fill in the price for each row.
// 41 fixed milestones (0.5 -> 20.5 kg, step 0.5) + 5 per-kg ranges.

export const STANDARD_FIXED_WEIGHTS: number[] = (() => {
  const arr: number[] = [];
  for (let w = 0.5; w <= 20.5 + 1e-9; w += 0.5) {
    arr.push(Math.round(w * 100) / 100);
  }
  return arr;
})();

export interface PerKgRange {
  min: number;
  max: number;
}

export const STANDARD_PERKG_RANGES: PerKgRange[] = [
  { min: 21, max: 44 },
  { min: 45, max: 99 },
  { min: 100, max: 299 },
  { min: 300, max: 499 },
  { min: 500, max: 9999 },
];

export const STANDARD_RATE_ROW_COUNT =
  STANDARD_FIXED_WEIGHTS.length + STANDARD_PERKG_RANGES.length;
