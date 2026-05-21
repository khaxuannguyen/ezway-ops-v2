# Phase 03 · Domain Helpers (`lib/domain/*`)

## Context links

- [Plan overview](./plan.md)
- [Phase 01 schema](./phase-01-prisma-schema.md)
- [Phase 02 seed](./phase-02-seed-data.md)
- [Researcher 02 §2, §4](./research/researcher-02-logistics-domain.md)

## Overview

- **Date**: 2026-05-17
- **Description**: Pure-TS, Prisma-free helper modules implementing the math rules: volumetric/chargeable weight + tier rounding, rate lookup + base cost, extra-cost summing + profit. Helpers accept plain types (number/Array) so they are unit-testable without DB and reusable from seed + UI server actions.
- **Priority**: P0 — used by Phase 02 seed (for order totals) and by Phase 03+ UI server actions.
- **Implementation status**: Not Started
- **Review status**: Not Reviewed

## Key Insights

- **No Prisma imports inside helpers.** Pass rate rows as plain array of `RateTier`. Caller does the DB query.
- Use `number` for weight (kg) and VND (rounded to int at boundaries). `Decimal` only at Prisma boundary.
- Tier rounding rule (from task brief): For weight W, find smallest `minWeightKg ≥ W`. (e.g., 0.8 → tier with `minWeightKg = 1.0`.) For ranges (21-44), tier matches if `minWeightKg ≤ W ≤ maxWeightKg`.
- Volumetric default divisor 5000; per-service override via param.
- Chargeable = max(actual, volumetric), then **rounded up to next tier minWeight**.
- Profit = totalFee − baseCost − extraCostTotal (VND, Int). Can be negative (loss).

## Requirements

| # | Requirement |
|---|-------------|
| R1 | `lib/domain/weight.ts` — volumetric, chargeable, tier rounding |
| R2 | `lib/domain/pricing.ts` — rate lookup, base cost calc |
| R3 | `lib/domain/profit.ts` — extra-cost sum, profit calc |
| R4 | `lib/domain/index.ts` — re-export all public functions + types |
| R5 | All functions pure (no side effects, no I/O) |
| R6 | No Prisma imports; only `type` imports if at all |
| R7 | `npm run lint` passes on these files |

## Architecture

### Public types (`lib/domain/index.ts` or per-file)

```typescript
export type CostRateType = "FIXED_TOTAL" | "PER_KG";

export interface RateTier {
  id: string;
  minWeightKg: number;
  maxWeightKg: number;
  rateType: CostRateType;
  amountVnd: number;
}

export interface ExtraCostInput {
  amountVnd: number;            // already quantity * unit
}

export interface PackageDimensions {
  actualWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}
```

### `lib/domain/weight.ts`

```typescript
import type { RateTier } from "./types";

const DEFAULT_DIVISOR = 5000;

/**
 * Volumetric weight = (L * W * H) / divisor.
 * Returns kg rounded to 2 decimals (avoids float drift).
 */
export function calculateVolumetricWeight(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  divisor: number = DEFAULT_DIVISOR,
): number {
  if (divisor <= 0) throw new Error("volumetricDivisor must be > 0");
  const raw = (lengthCm * widthCm * heightCm) / divisor;
  return Math.round(raw * 100) / 100;
}

/**
 * Round weight UP to the next tier's minWeightKg.
 * For 0.8kg with tiers [0.5, 1.0, 1.5, ...] → returns 1.0.
 * For weight inside a range tier (e.g., 25kg in 21-44), returns 25 unchanged.
 * Throws if no tier covers the weight.
 */
export function roundUpToTier(weightKg: number, tiers: readonly RateTier[]): number {
  const sorted = [...tiers].sort((a, b) => a.minWeightKg - b.minWeightKg);

  // 1. Range tiers (rateType === PER_KG, min < max): weight falls inside, return as-is.
  for (const t of sorted) {
    if (t.rateType === "PER_KG" && t.minWeightKg <= weightKg && weightKg <= t.maxWeightKg) {
      return weightKg;
    }
  }

  // 2. Fixed-step tiers (min === max): pick smallest min >= weight.
  for (const t of sorted) {
    if (t.rateType === "FIXED_TOTAL" && t.minWeightKg >= weightKg) {
      return t.minWeightKg;
    }
  }

  // 3. Above all FIXED tiers but inside a PER_KG range (e.g., 21-44, weight 22).
  //    Already handled by step 1, so anything reaching here is unreachable weight.
  throw new Error(`No tier covers weight ${weightKg}kg`);
}

/**
 * Chargeable = max(actual, volumetric), rounded UP to next tier.
 */
export function calculateChargeableWeight(
  pkg: PackageDimensions,
  tiers: readonly RateTier[],
  divisor: number = DEFAULT_DIVISOR,
): { volumetricKg: number; chargeableKg: number } {
  const volumetricKg = calculateVolumetricWeight(pkg.lengthCm, pkg.widthCm, pkg.heightCm, divisor);
  const max = Math.max(pkg.actualWeightKg, volumetricKg);
  const chargeableKg = roundUpToTier(max, tiers);
  return { volumetricKg, chargeableKg };
}
```

### `lib/domain/pricing.ts`

```typescript
import type { RateTier } from "./types";

/**
 * Look up the rate tier for a given (already rounded) chargeable weight.
 * Returns the tier OR null if none matches.
 */
export function findRateTier(
  chargeableKg: number,
  tiers: readonly RateTier[],
): RateTier | null {
  for (const t of tiers) {
    if (t.minWeightKg <= chargeableKg && chargeableKg <= t.maxWeightKg) return t;
  }
  return null;
}

/**
 * Base cost = FIXED_TOTAL.amountVnd OR PER_KG.amountVnd * chargeableKg.
 * Result is rounded to nearest VND (Int).
 */
export function calculateBaseCost(
  chargeableKg: number,
  tier: RateTier,
): number {
  if (tier.rateType === "FIXED_TOTAL") return tier.amountVnd;
  // PER_KG
  return Math.round(tier.amountVnd * chargeableKg);
}

/**
 * Convenience: look up tier + compute base cost in one call.
 * Throws if no tier matches.
 */
export function priceOrder(
  chargeableKg: number,
  tiers: readonly RateTier[],
): { tier: RateTier; baseCostVnd: number } {
  const tier = findRateTier(chargeableKg, tiers);
  if (!tier) throw new Error(`No rate tier for ${chargeableKg}kg`);
  return { tier, baseCostVnd: calculateBaseCost(chargeableKg, tier) };
}
```

### `lib/domain/profit.ts`

```typescript
import type { ExtraCostInput } from "./types";

/**
 * Sum all OrderExtraCost.amountVnd. Returns 0 for empty array.
 */
export function sumExtraCosts(extras: readonly ExtraCostInput[]): number {
  return extras.reduce((sum, e) => sum + e.amountVnd, 0);
}

/**
 * Profit = totalFee - baseCost - extraCostTotal.
 * Can be negative (loss-leader, mispricing).
 */
export interface ProfitInput {
  totalFeeVnd: number;
  baseCostVnd: number;
  extraCostTotalVnd: number;
}

export function calculateOrderProfit(input: ProfitInput): number {
  return input.totalFeeVnd - input.baseCostVnd - input.extraCostTotalVnd;
}

/**
 * Full breakdown: useful for UI display and invoice rows.
 */
export interface OrderTotals {
  baseCostVnd: number;
  extraCostTotalVnd: number;
  totalFeeVnd: number;
  profitVnd: number;
}

export function buildOrderTotals(args: {
  baseCostVnd: number;
  extras: readonly ExtraCostInput[];
  customerFeeVnd: number;   // The price quoted to customer (typically baseCost + markup + extras)
}): OrderTotals {
  const extraCostTotalVnd = sumExtraCosts(args.extras);
  const totalFeeVnd = args.customerFeeVnd;
  const profitVnd = calculateOrderProfit({
    totalFeeVnd,
    baseCostVnd: args.baseCostVnd,
    extraCostTotalVnd,
  });
  return {
    baseCostVnd: args.baseCostVnd,
    extraCostTotalVnd,
    totalFeeVnd,
    profitVnd,
  };
}
```

### `lib/domain/types.ts` (extracted, optional)

Move shared interfaces here. OK to keep them inline if dev prefers.

### `lib/domain/index.ts`

```typescript
export * from "./types";
export * from "./weight";
export * from "./pricing";
export * from "./profit";
```

## Related code files

- `lib/domain/weight.ts` — NEW
- `lib/domain/pricing.ts` — NEW
- `lib/domain/profit.ts` — NEW
- `lib/domain/types.ts` — NEW
- `lib/domain/index.ts` — NEW
- `prisma/seed.ts` — optionally imports `priceOrder` + `buildOrderTotals` for sample order math

## Implementation Steps

1. Create `lib/domain/types.ts` with `RateTier`, `ExtraCostInput`, `PackageDimensions`, `CostRateType`.
2. Create `lib/domain/weight.ts` with `calculateVolumetricWeight`, `roundUpToTier`, `calculateChargeableWeight`.
3. Create `lib/domain/pricing.ts` with `findRateTier`, `calculateBaseCost`, `priceOrder`.
4. Create `lib/domain/profit.ts` with `sumExtraCosts`, `calculateOrderProfit`, `buildOrderTotals`.
5. Create `lib/domain/index.ts` barrel.
6. Smoke-test manually in a scratch `node -e` or in seed: `priceOrder(3.5, euRates)` → `{ baseCostVnd: 1_250_000, tier: { minWeightKg: 3.5, ... } }` (numbers from Phase 02 seed table).
7. Run `npm run lint` — expect 0 errors.

## Todo list

- [ ] Create `lib/domain/types.ts`
- [ ] Create `lib/domain/weight.ts` with 3 exported functions
- [ ] Create `lib/domain/pricing.ts` with 3 exported functions
- [ ] Create `lib/domain/profit.ts` with 3 exported functions
- [ ] Create `lib/domain/index.ts` barrel re-export
- [ ] Manual smoke test: `calculateVolumetricWeight(30, 20, 10, 5000)` returns 1.2
- [ ] Manual smoke test: `roundUpToTier(0.8, tiers)` returns 1.0
- [ ] Manual smoke test: `roundUpToTier(25, tiers)` returns 25 (inside PER_KG range)
- [ ] Manual smoke test: `priceOrder(3.5, euRates).baseCostVnd` matches seed table
- [ ] `npm run lint` clean

## Success Criteria

- All 5 files compile under `tsc --noEmit` (via `npm run build`).
- Zero `any` types in public signatures.
- Zero Prisma imports (`grep -r "@prisma" lib/domain/` → empty).
- Functions pure (no `console.log`, no `Date.now()`, no random).
- Seed runs successfully importing from `@/lib/domain` (if Phase 02 was wired).

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `roundUpToTier` misses edge case (weight > all FIXED but no PER_KG covers it) | Med | Throw with clear msg; test 4 boundary cases (0.5, 0.8, 20.5, 21, 500, 9999) |
| Float drift in `0.5 + 0.5` loops in tests | Low | Use `Math.round(w * 100) / 100` defensively in helpers |
| Caller passes `Decimal` (Prisma type) instead of `number` | Med | Helpers type-annotate `number` strictly; caller does `Number(decimal)` |
| Negative `chargeableKg` or `amountVnd` | Low | Add `if (x < 0) throw` guards at function entry |
| Tier list not sorted by caller | Low | `roundUpToTier` sorts internally; other functions don't require sort |

## Security Considerations

- Pure math, no security surface.
- Prevent silent failures: `priceOrder` throws on missing tier (forces caller to handle), no fallback default.
- Money arithmetic stays in Int → no rounding-attack on micro-cents.

## Next steps

After this phase: [Phase 04 · Migrate and Verify](./phase-04-migrate-and-verify.md) runs the full pipeline.
