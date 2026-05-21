import type { RateTier } from "./types";

export function findRateTier(
  chargeableKg: number,
  tiers: readonly RateTier[],
): RateTier | null {
  for (const t of tiers) {
    if (t.minWeightKg <= chargeableKg && chargeableKg <= t.maxWeightKg) return t;
  }
  return null;
}

export function calculateBaseCost(chargeableKg: number, tier: RateTier): number {
  if (chargeableKg < 0) throw new Error("chargeableKg must be >= 0");
  if (tier.rateType === "FIXED_TOTAL") return tier.amountVnd;
  return Math.round(tier.amountVnd * chargeableKg);
}

export function priceOrder(
  chargeableKg: number,
  tiers: readonly RateTier[],
): { tier: RateTier; baseCostVnd: number } {
  const tier = findRateTier(chargeableKg, tiers);
  if (!tier) throw new Error(`No rate tier for ${chargeableKg}kg`);
  return { tier, baseCostVnd: calculateBaseCost(chargeableKg, tier) };
}
