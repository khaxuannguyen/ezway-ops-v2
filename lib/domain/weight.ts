import type { PackageDimensions, RateTier } from "./types";

const DEFAULT_DIVISOR = 5000;

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

export function roundUpToTier(weightKg: number, tiers: readonly RateTier[]): number {
  if (weightKg < 0) throw new Error("weightKg must be >= 0");

  const sorted = [...tiers].sort((a, b) => a.minWeightKg - b.minWeightKg);

  for (const t of sorted) {
    if (t.rateType === "PER_KG" && t.minWeightKg <= weightKg && weightKg <= t.maxWeightKg) {
      return weightKg;
    }
  }

  for (const t of sorted) {
    if (t.rateType === "FIXED_TOTAL" && t.minWeightKg >= weightKg) {
      return t.minWeightKg;
    }
  }

  throw new Error(`No tier covers weight ${weightKg}kg`);
}

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

export interface PackageWeights {
  actualWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  /** Số kiện cùng kích thước — 1 row form có thể đại diện N kiện thực tế. */
  quantity: number;
}

export function computePackageWeights(input: {
  actualWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  quantity?: number;
}, divisor: number = DEFAULT_DIVISOR): PackageWeights {
  const volumetricWeightKg = calculateVolumetricWeight(
    input.lengthCm,
    input.widthCm,
    input.heightCm,
    divisor,
  );
  const chargeableWeightKg = Math.max(input.actualWeightKg, volumetricWeightKg);
  return {
    actualWeightKg: input.actualWeightKg,
    volumetricWeightKg,
    chargeableWeightKg,
    quantity: input.quantity && input.quantity > 0 ? input.quantity : 1,
  };
}

export interface OrderPackageTotals {
  packageCount: number;
  totalActualWeight: number;
  totalVolumetricWeight: number;
  totalChargeableWeight: number;
}

export function calculateOrderPackageTotals(
  packages: readonly PackageWeights[],
): OrderPackageTotals {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return packages.reduce<OrderPackageTotals>(
    (acc, p) => {
      const q = p.quantity > 0 ? p.quantity : 1;
      return {
        packageCount: acc.packageCount + q,
        totalActualWeight: round2(acc.totalActualWeight + p.actualWeightKg * q),
        totalVolumetricWeight: round2(
          acc.totalVolumetricWeight + p.volumetricWeightKg * q
        ),
        totalChargeableWeight: round2(
          acc.totalChargeableWeight + p.chargeableWeightKg * q
        ),
      };
    },
    {
      packageCount: 0,
      totalActualWeight: 0,
      totalVolumetricWeight: 0,
      totalChargeableWeight: 0,
    },
  );
}
